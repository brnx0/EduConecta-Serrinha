import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/client";
import {
  aula, disciplinas, paramPeriodos, paramRegrasAvaliacao, presenca, series, turmas,
} from "../../db/schema.portal";
import { resolverMatricula } from "../boletim/boletim.service";
import {
  agruparDias, consolidarResumo,
  type DiaPresenca, type LinhaDia, type LinhaResumo, type PeriodoInfo, type ResumoFrequencia,
} from "./frequencia.calc.js";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Mínimo de frequência do segmento do aluno (série→curso_cod). Fallback 75. */
async function minimoFrequencia(turmaCod: number, ano: number): Promise<number> {
  const [row] = await db
    .select({ min: paramRegrasAvaliacao.frequenciaMinima })
    .from(turmas)
    .innerJoin(series, eq(turmas.serieCod, series.codLegado))
    .innerJoin(
      paramRegrasAvaliacao,
      and(eq(paramRegrasAvaliacao.segmentoCod, series.cursoCod), eq(paramRegrasAvaliacao.ano, ano)),
    )
    .where(eq(turmas.codLegado, turmaCod))
    .limit(1);
  return row?.min != null ? Number(row.min) : 75;
}

export async function resumoFrequencia(alunoCod: number, ano: number): Promise<ResumoFrequencia> {
  const vazio: ResumoFrequencia = {
    geral: { total: 0, presencas: 0, faltas: 0, justificadas: 0, percentual: 0, minimo: 75, status: "risco" },
    porDisciplina: [], porPeriodo: [],
  };
  const m = await resolverMatricula(alunoCod, ano);
  if (!m || m.turmaCod == null) return vazio;

  const minimo = await minimoFrequencia(m.turmaCod, ano);

  const rows: LinhaResumo[] = await db
    .select({ data: aula.data, disciplina: disciplinas.nome, status: presenca.status })
    .from(aula)
    .leftJoin(disciplinas, eq(aula.disciplinaCod, disciplinas.codLegado))
    .leftJoin(presenca, and(eq(presenca.aulaId, aula.id), eq(presenca.matriculaCod, m.matriculaCod)))
    .where(and(eq(aula.turmaCod, m.turmaCod), gte(aula.data, `${ano}-01-01`), lte(aula.data, `${ano}-12-31`)));

  const periodos: PeriodoInfo[] = await db
    .select({ ordem: paramPeriodos.ordem, nome: paramPeriodos.nome, dataInicio: paramPeriodos.dataInicio, dataFim: paramPeriodos.dataFim })
    .from(paramPeriodos)
    .where(eq(paramPeriodos.ano, ano))
    .orderBy(asc(paramPeriodos.ordem));

  return consolidarResumo(rows, periodos, minimo);
}

export async function diasFrequencia(alunoCod: number, ano: number, mes: number): Promise<DiaPresenca[]> {
  const m = await resolverMatricula(alunoCod, ano);
  if (!m || m.turmaCod == null) return [];

  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const ini = `${ano}-${pad2(mes)}-01`;
  const fim = `${ano}-${pad2(mes)}-${pad2(ultimo)}`;

  const rows: LinhaDia[] = await db
    .select({ data: aula.data, tempo: aula.tempoOrdem, disciplina: disciplinas.nome, status: presenca.status })
    .from(aula)
    .leftJoin(disciplinas, eq(aula.disciplinaCod, disciplinas.codLegado))
    .leftJoin(presenca, and(eq(presenca.aulaId, aula.id), eq(presenca.matriculaCod, m.matriculaCod)))
    .where(and(eq(aula.turmaCod, m.turmaCod), gte(aula.data, ini), lte(aula.data, fim)))
    .orderBy(asc(aula.data), asc(aula.tempoOrdem));

  return agruparDias(rows);
}
