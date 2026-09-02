/**
 * DTO Aluno completo retornado pela Home. Schema do app, independente
 * de tabelas legadas. Mappers no `infra/legacyAlunoRepository`
 * traduzem rows do banco em DTOs.
 */
export interface AlunoCompleto {
  pes_cod: number;
  aluno_turma_cod: number;
  matricula: string;
  nome: string;
  cpf: string;
  curso: string;
  serie: string;
  escola: string;
  escola_cod: number;
  turma: string;
  data_nascimento: string | null;
  sexo: string;
  situacao: string;
  turno: string;
  ano_letivo: number;
  total_aulas_anual: number;
  total_faltas: number;
  data_prox_atividade: string | null;
  disciplina_prox_atividade: string | null;
  descricao_prox_atividade: string | null;
  anos: string;
  ocorrencia_nova: number;
  ocorrencia_pendente: number;
}
