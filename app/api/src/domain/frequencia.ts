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

/**
 * DTOs do dashboard de frequência (`/frequencia/resumo` e `/frequencia/dias`).
 * Contrato espelhado em app/mobile/src/services/frequencia/FrequenciaService.tsx.
 */
export type RegistroStatus = 'presente' | 'falta' | 'justificada';
export type StatusGeral = 'em_dia' | 'atencao' | 'risco';

export interface GeralFreq {
  total: number; presencas: number; faltas: number; justificadas: number;
  percentual: number; minimo: number; status: StatusGeral;
}
export interface DisciplinaFreq {
  disciplina: string; total: number; presencas: number; faltas: number;
  justificadas: number; percentual: number; abaixoMinimo: boolean;
}
export interface PeriodoFreq {
  ordem: number; nome: string; total: number; presencas: number;
  faltas: number; justificadas: number; percentual: number;
}
export interface ResumoFrequencia {
  geral: GeralFreq; porDisciplina: DisciplinaFreq[]; porPeriodo: PeriodoFreq[];
}

export interface AulaPresenca { tempo: number; disciplina: string; status: RegistroStatus; cor: string }
export interface ResumoDia { total: number; presencas: number; faltas: number; justificadas: number }
export interface DiaPresenca { data: string; dia_semana: number; resumo: ResumoDia; aulas: AulaPresenca[] }

/** Uma aula com presença lançada pro aluno, já normalizada pelo repositório. */
export interface LinhaAula {
  data: string;            // YYYY-MM-DD
  tempo: number;
  disciplina: string;
  status: RegistroStatus;
  unidade: number | null;  // ordem do período letivo (1º, 2º, 3º...)
}
export interface PeriodoInfo { ordem: number; nome: string }
