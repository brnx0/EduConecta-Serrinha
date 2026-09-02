/**
 * DTOs Calendário Escolar.
 */
export interface DiaCalendario {
  dia: number;
  data: string;          // YYYY-MM-DD
  status_dia: string;    // "Letivo" | "Não Letivo" | etc
  motivo: string | null;
  cor: string;           // hex
}

export interface AtividadeCalendario {
  dia: number;
  atividade: string;
  disciplina: string;
  data: string;
  valor: number;
  nota: number;
}

export interface CalendarioMensalResposta {
  calendario: DiaCalendario[];
  atividades: AtividadeCalendario[];
}

export interface DiaLetivoUnidade {
  unidade: string;
  data_inicio: string;        // DD/MM/YYYY
  data_fim: string;
  total_dias_letivos: number;
}
