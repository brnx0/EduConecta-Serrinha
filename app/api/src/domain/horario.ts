/**
 * DTO Horário do quadro semanal do aluno.
 */
export interface HorarioItem {
  pes_cod_aluno: number;
  dia_semana: number;
  tempo: number;
  escola: string;
  disciplina: string;
  serie: string;
  turma: string;
  professor: string;
  ano_letivo: number;
}
