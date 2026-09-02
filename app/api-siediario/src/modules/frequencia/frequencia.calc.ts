export type RegistroStatus = "presente" | "falta" | "justificada";

export interface GeralFreq {
  total: number; presencas: number; faltas: number; justificadas: number;
  percentual: number; minimo: number; status: "em_dia" | "atencao" | "risco";
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

export interface LinhaResumo { data: string | null; disciplina: string | null; status: string | null }
export interface LinhaDia { data: string | null; tempo: number | null; disciplina: string | null; status: string | null }
export interface PeriodoInfo { ordem: number; nome: string; dataInicio: string | null; dataFim: string | null }

const COR_STATUS: Record<RegistroStatus, string> = {
  presente: "#22c55e", falta: "#ef4444", justificada: "#eab308",
};
export const corStatus = (s: RegistroStatus): string => COR_STATUS[s];

export function mapStatusPortal(s: string | null): RegistroStatus | null {
  if (s === "presente") return "presente";
  if (s === "falta") return "falta";
  if (s === "falta_justificada") return "justificada";
  return null; // pendente / null / desconhecido
}

export function pct(presencas: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((presencas / total) * 1000) / 10;
}

export function faixaStatus(percentual: number, minimo: number): "em_dia" | "atencao" | "risco" {
  if (percentual >= minimo) return "em_dia";
  if (percentual >= minimo - 5) return "atencao";
  return "risco";
}

interface Acc { total: number; presencas: number; faltas: number; justificadas: number }
const novoAcc = (): Acc => ({ total: 0, presencas: 0, faltas: 0, justificadas: 0 });
function acumular(a: Acc, st: RegistroStatus): void {
  a.total++;
  if (st === "presente") a.presencas++;
  else if (st === "falta") a.faltas++;
  else a.justificadas++;
}

function weekdayUTC(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay() + 1; // 0=Dom..6=Sáb → 1..7
}

export function consolidarResumo(
  rows: LinhaResumo[], periodos: PeriodoInfo[], minimo: number,
): ResumoFrequencia {
  const geral = novoAcc();
  const porDisc = new Map<string, Acc>();
  const porPer = new Map<number, Acc>();

  for (const r of rows) {
    const st = mapStatusPortal(r.status);
    if (!st || !r.data) continue;
    acumular(geral, st);

    const disc = r.disciplina ?? "—";
    const accD = porDisc.get(disc) ?? novoAcc();
    acumular(accD, st);
    porDisc.set(disc, accD);

    const per = periodos.find((p) => p.dataInicio && p.dataFim && p.dataInicio <= r.data! && r.data! <= p.dataFim);
    if (per) {
      const accP = porPer.get(per.ordem) ?? novoAcc();
      acumular(accP, st);
      porPer.set(per.ordem, accP);
    }
  }

  return {
    geral: {
      ...geral,
      percentual: pct(geral.presencas, geral.total),
      minimo,
      status: faixaStatus(pct(geral.presencas, geral.total), minimo),
    },
    porDisciplina: [...porDisc.entries()]
      .map(([disciplina, a]) => ({
        disciplina, ...a, percentual: pct(a.presencas, a.total),
        abaixoMinimo: pct(a.presencas, a.total) < minimo,
      }))
      .sort((x, y) => x.disciplina.localeCompare(y.disciplina)),
    porPeriodo: periodos
      .filter((p) => porPer.has(p.ordem))
      .map((p) => {
        const a = porPer.get(p.ordem)!;
        return { ordem: p.ordem, nome: p.nome, ...a, percentual: pct(a.presencas, a.total) };
      }),
  };
}

export function agruparDias(rows: LinhaDia[]): DiaPresenca[] {
  const porData = new Map<string, AulaPresenca[]>();
  for (const r of rows) {
    const st = mapStatusPortal(r.status);
    if (!st || !r.data) continue;
    const lista = porData.get(r.data) ?? [];
    lista.push({ tempo: r.tempo ?? 0, disciplina: r.disciplina ?? "—", status: st, cor: corStatus(st) });
    porData.set(r.data, lista);
  }
  return [...porData.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // reversa
    .map(([data, aulas]) => {
      const resumo = aulas.reduce<ResumoDia>(
        (acc, a) => {
          acc.total++;
          if (a.status === "presente") acc.presencas++;
          else if (a.status === "falta") acc.faltas++;
          else acc.justificadas++;
          return acc;
        },
        { total: 0, presencas: 0, faltas: 0, justificadas: 0 },
      );
      return { data, dia_semana: weekdayUTC(data), resumo, aulas: aulas.sort((a, b) => a.tempo - b.tempo) };
    });
}
