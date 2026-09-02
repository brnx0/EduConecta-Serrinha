/**
 * DTOs do domínio Primeiro Acesso. Schema próprio, independente de
 * estrutura do banco legado.
 */

export interface ValidarPrimeiroAcessoInput {
  cpfResponsavel: string;       // 11 dígitos sem máscara
  cpfAluno: string;              // 11 dígitos sem máscara
  dataNascimentoAluno: string;   // ISO YYYY-MM-DD
  email: string;
}

export interface VinculoResponsavelAluno {
  alunoPesCod: number;     // referência a GER_PESSOA_FISICA.PES_COD (legado)
  nomeAluno: string;
  nomeResponsavel: string;
}

export interface CriarUsuarioInput {
  cpfResponsavel: string;
  senha: string;
  email: string;
}

export interface CriarUsuarioResultado {
  id: number;
  cpf: string;
  email: string | null;
  alunosVinculados: number;
}

export interface LoginInput {
  cpf: string;
  senha: string;
}

export interface LoginPayloadJwt {
  usr_codigo: number;
  cpf: string;
  responsavel_nome: string;
  alunos: Array<{
    pes_cod: number;
    nome: string;
    cpf: string;
  }>;
}
