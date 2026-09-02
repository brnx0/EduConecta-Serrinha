import argon2 from '@node-rs/argon2';
import { prisma } from '../db.js';
import { legacyAlunoRepository } from '../infra/legacyAlunoRepository.js';
import type {
  ValidarPrimeiroAcessoInput,
  VinculoResponsavelAluno,
  CriarUsuarioInput,
  CriarUsuarioResultado,
  LoginInput,
  LoginPayloadJwt,
} from '../domain/primeiroAcesso.js';

export type ValidarPrimeiroAcessoResultado =
  | { tipo: 'ok'; aluno: VinculoResponsavelAluno }
  | { tipo: 'ja_cadastrado' }
  | { tipo: 'dados_nao_conferem' };

/**
 * Valida dados de primeiro acesso:
 *  1. Verifica se CPF/email já têm cadastro em EDC_RESPONSAVEL.
 *  2. Verifica no banco legado se a tripla (cpfResp, cpfAluno, dataNasc)
 *     identifica um aluno + responsável legal cadastrados.
 */
export async function validarPrimeiroAcesso(
  input: ValidarPrimeiroAcessoInput
): Promise<ValidarPrimeiroAcessoResultado> {
  // 1. Existe usuário com esse CPF ou email no app?
  const existente = await prisma.responsavel.findFirst({
    where: {
      OR: [
        { cpf: input.cpfResponsavel },
        ...(input.email ? [{ email: input.email }] : []),
      ],
    },
    select: { id: true },
  });
  if (existente) {
    return { tipo: 'ja_cadastrado' };
  }

  // 2. Existe vínculo aluno ↔ responsável no banco legado?
  const vinculo = await legacyAlunoRepository.findVinculoExato({
    cpfResponsavel: input.cpfResponsavel,
    cpfAluno: input.cpfAluno,
    dataNascimentoAluno: input.dataNascimentoAluno,
  });
  if (!vinculo) {
    return { tipo: 'dados_nao_conferem' };
  }

  return { tipo: 'ok', aluno: vinculo };
}

export type CriarUsuarioResult =
  | { tipo: 'ok'; usuario: CriarUsuarioResultado }
  | { tipo: 'ja_cadastrado' };

/**
 * Cria usuário no app:
 *  1. Garante que CPF/email não estão em uso.
 *  2. Hash de senha com argon2id (memory-hard, padrão moderno).
 *  3. Insere em EDC_RESPONSAVEL.
 *  4. Sincroniza EDC_RESPONSAVEL_ALUNO via lookup em GER_PESSOA_FISICA.
 */
export async function criarUsuario(
  input: CriarUsuarioInput
): Promise<CriarUsuarioResult> {
  // Defensive: revalida duplicação (passo `validar` deveria ter pego)
  const existente = await prisma.responsavel.findFirst({
    where: {
      OR: [{ cpf: input.cpfResponsavel }, { email: input.email }],
    },
    select: { id: true },
  });
  if (existente) {
    return { tipo: 'ja_cadastrado' };
  }

  const senhaHash = await argon2.hash(input.senha, {
    algorithm: argon2.Algorithm.Argon2id,
  });

  // Busca alunos vinculados ANTES do INSERT (uma roundtrip a menos no banco)
  const alunos = await legacyAlunoRepository.findAlunosPorCpfResponsavel(
    input.cpfResponsavel
  );

  const responsavel = await prisma.responsavel.create({
    data: {
      cpf: input.cpfResponsavel,
      email: input.email,
      senhaHash,
      ativo: true,
      alunos: {
        create: alunos.map((a) => ({ alunoPesCod: a.alunoPesCod })),
      },
    },
    select: { id: true, cpf: true, email: true },
  });

  return {
    tipo: 'ok',
    usuario: {
      id: responsavel.id,
      cpf: responsavel.cpf,
      email: responsavel.email,
      alunosVinculados: alunos.length,
    },
  };
}

export type LoginResultado =
  | { tipo: 'ok'; payload: LoginPayloadJwt }
  | { tipo: 'credenciais_invalidas' }
  | { tipo: 'inativo' }
  | { tipo: 'primeiro_acesso_pendente' }
  | { tipo: 'sem_alunos' };

/**
 * Autentica responsável e retorna payload JWT (sem assinar — assinatura
 * fica no controller pra usar app.jwt do Fastify).
 *
 * Anti-enumeração: "CPF não cadastrado" e "senha errada" retornam o mesmo
 * `credenciais_invalidas`. Exceção: se CPF é um responsável legal cadastrado
 * na escola (`PFI_CPF_RESP` em `GER_PESSOA_FISICA`) mas sem usuário no app,
 * retorna `primeiro_acesso_pendente` pra UX direcionar pro fluxo de cadastro.
 */
export async function login(input: LoginInput): Promise<LoginResultado> {
  const responsavel = await prisma.responsavel.findUnique({
    where: { cpf: input.cpf },
  });

  if (!responsavel) {
    // Diferencia: CPF é responsavel legal mas sem login? → fluxo primeiro acesso
    const isResponsavelLegal = await legacyAlunoRepository.cpfIsResponsavel(input.cpf);
    if (isResponsavelLegal) {
      return { tipo: 'primeiro_acesso_pendente' };
    }
    return { tipo: 'credenciais_invalidas' };
  }

  const senhaOk = await argon2.verify(responsavel.senhaHash, input.senha);
  if (!senhaOk) {
    return { tipo: 'credenciais_invalidas' };
  }

  if (!responsavel.ativo) {
    return { tipo: 'inativo' };
  }

  // Carrega alunos do banco legado (sem persistir cache em EDC_RESPONSAVEL_ALUNO
  // — sync fica de fora por enquanto; query direta a cada login).
  const alunos = await legacyAlunoRepository.findAlunosPorCpfResponsavel(input.cpf);
  if (alunos.length === 0) {
    return { tipo: 'sem_alunos' };
  }

  // Nome do responsável: pega da primeira ocorrência (mesmo nome em todos
  // alunos do mesmo responsável). Em prod ideal seria coluna própria.
  const responsavelNome = alunos[0].nomeResponsavel;

  return {
    tipo: 'ok',
    payload: {
      usr_codigo: responsavel.id,
      cpf: responsavel.cpf,
      responsavel_nome: responsavelNome,
      alunos: alunos.map((a) => ({
        pes_cod: a.alunoPesCod,
        nome: a.nomeAluno,
        cpf: input.cpf,
      })),
    },
  };
}
