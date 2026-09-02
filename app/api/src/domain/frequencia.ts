/**
 * DTO Frequência diária do aluno por mês.
 */
export interface FrequenciaDia {
  dia: number;
  data: string;            // YYYY-MM-DD
  status_dia: string | null; // "Presente" | "Ausente" | "Parcialmente Presente" | null (sem aula)
  motivo: string | null;
  cor: string;             // hex color pra UI
}
