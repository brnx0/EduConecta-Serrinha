/**
 * DTO Ocorrência do aluno.
 */
export interface OcorrenciaItem {
  ocorrencia_id: number;
  titulo: string;
  tipo: string;
  data_ocorrencia: string;          // dd/MM/yyyy HH:mm
  aluno: string;
  ciente: 'Sim' | 'Não';
  dt_confirmacao: string | null;
  professor: string;
  ano: number;
  escola: string;
  turma: string;
  descricao: string;
  exige_conhecimento: number;
}
