import type {
  AulaPresenca, DiaPresenca, LinhaAula, PeriodoInfo, RegistroStatus,
  ResumoDia, ResumoFrequencia, StatusGeral,
} from '../domain/frequencia.js';

const COR_STATUS: Record<RegistroStatus, string> = {
  presente: '#22c55e',
  falta: '#ef4444',
  justificada: '#eab308',
};

export function pct(presencas: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((presencas / total) * 1000) / 10;
}

export function faixaStatus(percentual: number, minimo: number): StatusGeral {
  if (percentual >= minimo) return 'em_dia';
  if (percentual >= minimo - 5) return 'atencao';
  return 'risco';
}

const novoAcc = (): ResumoDia => ({ total: 0, presencas: 0, faltas: 0, justificadas: 0 });

// Justificada entra no total e não conta como presença: pesa na % igual a
// falta, mas aparece separada nos totais.
function acumular(a: ResumoDia, st: RegistroStatus): void {
  a.total++;
  if (st === 'presente') a.presencas++;
  else if (st === 'falta') a.faltas++;
  else a.justificadas++;
}

function diaSemana(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay() + 1; // 1=Dom..7=Sáb
}

export function consolidarResumo(
  linhas: LinhaAula[], periodos: PeriodoInfo[], minimo: number,
): ResumoFrequencia {
  const geral = novoAcc();
  const porDisc = new Map<string, ResumoDia>();
  const porPer = new Map<number, ResumoDia>();

  for (const l of linhas) {
    acumular(geral, l.status);

    const d = porDisc.get(l.disciplina) ?? novoAcc();
    acumular(d, l.status);
    porDisc.set(l.disciplina, d);

    if (l.unidade != null) {
      const p = porPer.get(l.unidade) ?? novoAcc();
      acumular(p, l.status);
      porPer.set(l.unidade, p);
    }
  }

  const percentual = pct(geral.presencas, geral.total);
  return {
    geral: { ...geral, percentual, minimo, status: faixaStatus(percentual, minimo) },
    porDisciplina: [...porDisc.entries()]
      .map(([disciplina, a]) => {
        const p = pct(a.presencas, a.total);
        return { disciplina, ...a, percentual: p, abaixoMinimo: p < minimo };
      })
      .sort((x, y) => x.disciplina.localeCompare(y.disciplina)),
    porPeriodo: periodos
      .filter((p) => porPer.has(p.ordem))
      .map((p) => {
        const a = porPer.get(p.ordem)!;
        return { ordem: p.ordem, nome: p.nome, ...a, percentual: pct(a.presencas, a.total) };
      }),
  };
}

/** Dias com aula, do mais recente pro mais antigo; aulas por tempo. */
export function agruparDias(linhas: LinhaAula[]): DiaPresenca[] {
  const porData = new Map<string, AulaPresenca[]>();
  for (const l of linhas) {
    const lista = porData.get(l.data) ?? [];
    lista.push({ tempo: l.tempo, disciplina: l.disciplina, status: l.status, cor: COR_STATUS[l.status] });
    porData.set(l.data, lista);
  }
  return [...porData.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([data, aulas]) => {
      const resumo = novoAcc();
      for (const a of aulas) acumular(resumo, a.status);
      return { data, dia_semana: diaSemana(data), resumo, aulas: aulas.sort((a, b) => a.tempo - b.tempo) };
    });
}
