import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { validarPrimeiroAcesso, criarUsuario, login } from '../services/authService.js';

const cpfRegex = /^\d{11}$/;
const dataIsoRegex = /^\d{4}-\d{2}-\d{2}$/;

const validarSchema = z.object({
  cpfResponsavel: z.string().regex(cpfRegex, 'CPF deve ter 11 dígitos numéricos'),
  cpfAluno: z.string().regex(cpfRegex, 'CPF deve ter 11 dígitos numéricos'),
  dataNascimentoAluno: z
    .string()
    .regex(dataIsoRegex, 'Data deve estar no formato ISO YYYY-MM-DD')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Data inválida'),
  email: z.string().email('E-mail inválido').max(255),
});

const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /auth/primeiro-acesso/validar
   *
   * Valida dados antes de criar usuário no app.
   * Respostas:
   *  - 200 OK         { alunoPesCod, nomeAluno } — pode prosseguir
   *  - 409 Conflict   { error: "ja_cadastrado", message } — CPF/email já tem login
   *  - 422 Unproc.    { error: "dados_nao_conferem", message } — não bate com cadastro escolar
   *  - 400 Bad Req.   { error: "validation", details } — payload inválido
   */
  app.post('/primeiro-acesso/validar', async (req, reply) => {
    const parsed = validarSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'validation',
        details: parsed.error.errors,
      });
    }

    const resultado = await validarPrimeiroAcesso(parsed.data);

    switch (resultado.tipo) {
      case 'ok':
        return reply.code(200).send({
          alunoPesCod: resultado.aluno.alunoPesCod,
          nomeAluno: resultado.aluno.nomeAluno,
        });

      case 'ja_cadastrado':
        return reply.code(409).send({
          error: 'ja_cadastrado',
          message: 'Este CPF ou e-mail já possui cadastro. Use a opção "Esqueci a senha".',
        });

      case 'dados_nao_conferem':
        return reply.code(422).send({
          error: 'dados_nao_conferem',
          message:
            'Dados não conferem com o cadastro escolar. Verifique as informações ou entre em contato com a escola.',
        });
    }
  });

  /**
   * POST /auth/primeiro-acesso/criar
   *
   * Cria usuário após validação. Senha hashada com argon2id.
   * Vincula alunos automaticamente via GER_PESSOA_FISICA.PFI_CPF_RESP.
   *
   * Respostas:
   *  - 201 Created   { id, cpf, email, alunosVinculados }
   *  - 409 Conflict  { error: "ja_cadastrado", message } — já tem usuário com esse CPF/email
   *  - 400 Bad Req.  { error: "validation", details } — payload inválido
   */
  const criarSchema = z.object({
    cpfResponsavel: z.string().regex(cpfRegex, 'CPF deve ter 11 dígitos numéricos'),
    senha: z.string().min(6, 'Senha mínima 6 caracteres').max(128),
    email: z.string().email('E-mail inválido').max(255),
  });

  /**
   * POST /auth/login
   *
   * Body: { cpf, senha }
   * Respostas:
   *  - 200 OK             { token } — JWT 8h, payload { usr_codigo, responsavel_nome, alunos[] }
   *  - 401 Unauthorized   { error: "credenciais_invalidas" } — anti-enumeração (CPF e/ou senha errados)
   *  - 403 Forbidden      { error: "inativo" }
   *  - 422 Unprocessable  { error: "primeiro_acesso_pendente" } — CPF é responsável legal mas sem login
   *  - 422 Unprocessable  { error: "sem_alunos" } — login OK mas zero alunos vinculados
   *  - 400 Bad Request    { error: "validation", details }
   */
  const loginSchema = z.object({
    cpf: z.string().regex(cpfRegex, 'CPF deve ter 11 dígitos numéricos'),
    senha: z.string().min(1, 'Senha obrigatória').max(128),
  });

  app.post('/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'validation',
        details: parsed.error.errors,
      });
    }

    const resultado = await login(parsed.data);

    switch (resultado.tipo) {
      case 'ok': {
        const token = app.jwt.sign(resultado.payload, { expiresIn: '8h' });
        return reply.code(200).send({ token });
      }
      case 'credenciais_invalidas':
        return reply.code(401).send({
          error: 'credenciais_invalidas',
          message: 'CPF e/ou senha incorretos.',
        });
      case 'inativo':
        return reply.code(403).send({
          error: 'inativo',
          message: 'Seu usuário encontra-se inativo. Entre em contato com a escola.',
        });
      case 'primeiro_acesso_pendente':
        return reply.code(422).send({
          error: 'primeiro_acesso_pendente',
          message: 'CPF não cadastrado, deseja realizar o cadastro agora?',
        });
      case 'sem_alunos':
        return reply.code(422).send({
          error: 'sem_alunos',
          message: 'Seu usuário não possui aluno(s) vinculado(s). Entre em contato com a escola.',
        });
    }
  });

  app.post('/primeiro-acesso/criar', async (req, reply) => {
    const parsed = criarSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'validation',
        details: parsed.error.errors,
      });
    }

    const resultado = await criarUsuario(parsed.data);

    switch (resultado.tipo) {
      case 'ok':
        return reply.code(201).send(resultado.usuario);

      case 'ja_cadastrado':
        return reply.code(409).send({
          error: 'ja_cadastrado',
          message: 'Este CPF ou e-mail já possui cadastro.',
        });
    }
  });
};

export default authRoutes;
