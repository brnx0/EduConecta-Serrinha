# Frequência Global do Responsável — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a tela de frequência (cópia do calendário) por um dashboard de frequência global + uma visão diária não-calendário, alimentados por dois endpoints novos no api-siediario.

**Architecture:** Backend lê `aula`+`presenca` do portal (Postgres), consolida em agregados puros (testáveis) e expõe `/frequencia/resumo` (ano) e `/frequencia/dias` (mês). Mobile reescreve `FrequenciaScreen` como dashboard e adiciona `FrequenciaDiariaScreen` (sub-tela). Lógica de cálculo isolada em funções puras.

**Tech Stack:** Fastify 5, Drizzle ORM, postgres-js, zod, vitest (backend); Expo RN, NativeWind, react-navigation bottom-tabs (mobile).

## Global Constraints

- `% = presencas / total * 100`, onde `total = presencas + faltas + justificadas`. Status `pendente`/sem-registro NÃO entra no total.
- Falta justificada **conta como falta** na %, mas aparece separada nos totais.
- Mínimo exigido = `param_regras_avaliacao.frequencia_minima` do segmento do aluno (`turmas.serie_cod` → `series.curso_cod` → `segmento_cod`); **fallback 75**.
- Faixas de status (mínimo `m`): `freq ≥ m` → `"em_dia"`; `m-5 ≤ freq < m` → `"atencao"`; `freq < m-5` → `"risco"`.
- Cores: presente `#22c55e`, falta `#ef4444`, justificada `#eab308`.
- `dia_semana`: 1=Dom .. 7=Sáb.
- Auth: toda rota usa `app.authenticate` + checa `pesCodAluno ∈ req.user.alunos` (403 senão), `422` em query inválida.
- Código TS escrito normal (não-caveman). Imports ESM com extensão `.js`.

---

### Task 1: Funções puras de cálculo + unit tests

**Files:**
- Create: `app/api-siediario/src/modules/frequencia/frequencia.calc.ts`
- Test: `app/api-siediario/tests/unit/frequencia.calc.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type RegistroStatus = "presente" | "falta" | "justificada"`
  - `interface ResumoFrequencia { geral: GeralFreq; porDisciplina: DisciplinaFreq[]; porPeriodo: PeriodoFreq[] }`
  - `interface DiaPresenca { data: string; dia_semana: number; resumo: ResumoDia; aulas: AulaPresenca[] }`
  - `mapStatusPortal(s: string | null): RegistroStatus | null`
  - `pct(presencas: number, total: number): number`
  - `faixaStatus(percentual: number, minimo: number): "em_dia" | "atencao" | "risco"`
  - `corStatus(s: RegistroStatus): string`
  - `consolidarResumo(rows: LinhaResumo[], periodos: PeriodoInfo[], minimo: number): ResumoFrequencia`
  - `agruparDias(rows: LinhaDia[]): DiaPresenca[]`

- [ ] **Step 1: Write the failing test**

`app/api-siediario/tests/unit/frequencia.calc.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  agruparDias, consolidarResumo, faixaStatus, mapStatusPortal, pct,
} from "../../src/modules/frequencia/frequencia.calc.js";

describe("pct", () => {
  it("0 total → 0", () => expect(pct(0, 0)).toBe(0));
  it("arredonda 1 casa", () => expect(pct(85, 88)).toBe(96.6));
  it("100%", () => expect(pct(10, 10)).toBe(100));
});

describe("mapStatusPortal", () => {
  it("mapeia portal → app", () => {
    expect(mapStatusPortal("presente")).toBe("presente");
    expect(mapStatusPortal("falta")).toBe("falta");
    expect(mapStatusPortal("falta_justificada")).toBe("justificada");
  });
  it("pendente/null → null", () => {
    expect(mapStatusPortal("pendente")).toBeNull();
    expect(mapStatusPortal(null)).toBeNull();
  });
});

describe("faixaStatus (min 80)", () => {
  it("≥ min → em_dia", () => expect(faixaStatus(80, 80)).toBe("em_dia"));
  it("min-5..<min → atencao", () => {
    expect(faixaStatus(79.9, 80)).toBe("atencao");
    expect(faixaStatus(75, 80)).toBe("atencao");
  });
  it("< min-5 → risco", () => expect(faixaStatus(74.9, 80)).toBe("risco"));
});

describe("consolidarResumo", () => {
  const periodos = [
    { ordem: 2, nome: "2º Trimestre", dataInicio: "2026-06-01", dataFim: "2026-06-30" },
  ];
  const rows = [
    { data: "2026-06-10", disciplina: "Matemática", status: "presente" },
    { data: "2026-06-10", disciplina: "Português", status: "falta_justificada" },
    { data: "2026-06-12", disciplina: "Matemática", status: "presente" },
    { data: "2026-06-12", disciplina: "Ed. Física", status: "falta" },
    { data: "2026-06-12", disciplina: "Matemática", status: "pendente" }, // ignorado
  ];
  const r = consolidarResumo(rows, periodos, 80);

  it("geral conta justificada como falta no total", () => {
    expect(r.geral.total).toBe(4);
    expect(r.geral.presencas).toBe(2);
    expect(r.geral.faltas).toBe(1);
    expect(r.geral.justificadas).toBe(1);
    expect(r.geral.percentual).toBe(50);
    expect(r.geral.status).toBe("risco");
    expect(r.geral.minimo).toBe(80);
  });
  it("agrupa por disciplina", () => {
    const mat = r.porDisciplina.find((d) => d.disciplina === "Matemática")!;
    expect(mat.total).toBe(2);
    expect(mat.presencas).toBe(2);
    expect(mat.percentual).toBe(100);
    expect(mat.abaixoMinimo).toBe(false);
    const ef = r.porDisciplina.find((d) => d.disciplina === "Ed. Física")!;
    expect(ef.percentual).toBe(0);
    expect(ef.abaixoMinimo).toBe(true);
  });
  it("agrupa por período", () => {
    expect(r.porPeriodo).toHaveLength(1);
    expect(r.porPeriodo[0].ordem).toBe(2);
    expect(r.porPeriodo[0].total).toBe(4);
  });
});

describe("agruparDias", () => {
  const rows = [
    { data: "2026-06-10", tempo: 1, disciplina: "Matemática", status: "presente" },
    { data: "2026-06-10", tempo: 2, disciplina: "Português", status: "falta" },
    { data: "2026-06-12", tempo: 1, disciplina: "Matemática", status: "presente" },
    { data: "2026-06-12", tempo: 2, disciplina: "Arte", status: "pendente" }, // ignorado
  ];
  const dias = agruparDias(rows);

  it("ordem reversa por data", () => {
    expect(dias.map((d) => d.data)).toEqual(["2026-06-12", "2026-06-10"]);
  });
  it("dia 10 tem 2 aulas, 1 presença 1 falta", () => {
    const d10 = dias.find((d) => d.data === "2026-06-10")!;
    expect(d10.aulas).toHaveLength(2);
    expect(d10.resumo).toEqual({ total: 2, presencas: 1, faltas: 1, justificadas: 0 });
    expect(d10.dia_semana).toBe(4); // 2026-06-10 = quarta → 4
  });
  it("ignora pendente nas aulas", () => {
    const d12 = dias.find((d) => d.data === "2026-06-12")!;
    expect(d12.aulas).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace app/api-siediario`
Expected: FAIL — "Cannot find module .../frequencia.calc.js" / funções indefinidas.

- [ ] **Step 3: Write the implementation**

`app/api-siediario/src/modules/frequencia/frequencia.calc.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace app/api-siediario`
Expected: PASS (todos os describes verdes).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck --workspace app/api-siediario`
Expected: 0 erros nos arquivos novos.

- [ ] **Step 6: Commit**

```bash
git add app/api-siediario/src/modules/frequencia/frequencia.calc.ts app/api-siediario/tests/unit/frequencia.calc.test.ts
git commit -m "feat(frequencia): funcoes puras de calculo + unit tests"
```

---

### Task 2: Seed de aulas + presenças (ADRYAN, junho/2026)

**Files:**
- Create: `app/api-siediario/seeds/frequencia_adryan_junho.sql`

**Interfaces:**
- Consumes: turma 54307, matrícula 951399 (ADRYAN), disciplinas 109/141/116/121.
- Produces: ~88 aulas + 88 presenças em junho/2026 (85 presente, 2 falta, 1 justificada).

- [ ] **Step 1: Escrever o SQL de seed**

`app/api-siediario/seeds/frequencia_adryan_junho.sql`:
```sql
BEGIN;

-- Aulas de junho/2026 (dias úteis) para a turma 54307 (ADRYAN), 4 disciplinas/tempos.
WITH dias AS (
  SELECT d::date AS data
  FROM generate_series('2026-06-01'::date, '2026-06-30'::date, '1 day') d
  WHERE extract(dow FROM d) BETWEEN 1 AND 5
),
disc AS (
  SELECT * FROM (VALUES (109,1),(141,2),(116,3),(121,4)) AS t(disciplina_cod, tempo)
),
novas AS (
  INSERT INTO aula (turma_cod, disciplina_cod, data, tempo_ordem, realizada)
  SELECT 54307, disc.disciplina_cod, dias.data, disc.tempo, true
  FROM dias CROSS JOIN disc
  RETURNING id, data, tempo_ordem
)
INSERT INTO presenca (aula_id, matricula_cod, status, origem)
SELECT n.id, 951399,
  CASE
    WHEN extract(day FROM n.data) = 10 AND n.tempo_ordem = 2 THEN 'falta_justificada'
    WHEN extract(day FROM n.data) IN (12, 19) AND n.tempo_ordem = 4 THEN 'falta'
    ELSE 'presente'
  END,
  'sistema'
FROM novas n;

COMMIT;
```

- [ ] **Step 2: Aplicar no Postgres docker**

Run:
```bash
docker cp app/api-siediario/seeds/frequencia_adryan_junho.sql siediario_pg:/tmp/seed_freq.sql
docker exec -i siediario_pg psql -U siediario -d siediario -v ON_ERROR_STOP=1 -f /tmp/seed_freq.sql
```
Expected: `BEGIN` / `INSERT 0 88` / `COMMIT`.

- [ ] **Step 3: Conferir contagem**

Run:
```bash
docker exec -i siediario_pg psql -U siediario -d siediario -t -A -F' | ' -c "SELECT p.status, count(*) FROM presenca p JOIN aula a ON a.id=p.aula_id WHERE a.turma_cod=54307 AND p.matricula_cod=951399 GROUP BY p.status ORDER BY 1;"
```
Expected: `falta | 2`, `falta_justificada | 1`, `presente | 85`.

- [ ] **Step 4: Commit**

```bash
git add app/api-siediario/seeds/frequencia_adryan_junho.sql
git commit -m "chore(frequencia): seed de aulas+presencas ADRYAN junho/2026"
```

---

### Task 3: Service + rota `/frequencia/resumo`

**Files:**
- Modify: `app/api-siediario/src/modules/frequencia/frequencia.service.ts` (reescreve)
- Modify: `app/api-siediario/src/modules/frequencia/frequencia.routes.ts`

**Interfaces:**
- Consumes: `consolidarResumo`, `ResumoFrequencia` (Task 1); `resolverMatricula` (boletim.service).
- Produces: `resumoFrequencia(alunoCod: number, ano: number): Promise<ResumoFrequencia>`; rota `GET /frequencia/resumo?pesCodAluno&ano`.

- [ ] **Step 1: Reescrever o service**

`app/api-siediario/src/modules/frequencia/frequencia.service.ts` (substitui todo o conteúdo):
```ts
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
```

- [ ] **Step 2: Reescrever a rota**

`app/api-siediario/src/modules/frequencia/frequencia.routes.ts` (substitui todo o conteúdo):
```ts
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { diasFrequencia, resumoFrequencia } from "./frequencia.service.js";

const anoQuery = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  ano: z.coerce.number().int().positive(),
});
const mesQuery = anoQuery.extend({ mes: z.coerce.number().int().min(1).max(12) });

function negarSeNaoVinculado(reply: FastifyReply, alunos: number[], pesCod: number): boolean {
  if (!alunos.includes(pesCod)) {
    reply.code(403).send({ error: "acesso_negado", message: "Aluno não vinculado a este responsável." });
    return true;
  }
  return false;
}

export async function frequenciaRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/frequencia/resumo", async (req, reply) => {
    const p = anoQuery.safeParse(req.query);
    if (!p.success) return reply.code(422).send({ error: "dados_invalidos", detalhes: p.error.flatten() });
    if (negarSeNaoVinculado(reply, req.user.alunos ?? [], p.data.pesCodAluno)) return;
    return reply.send(await resumoFrequencia(p.data.pesCodAluno, p.data.ano));
  });

  app.get("/frequencia/dias", async (req, reply) => {
    const p = mesQuery.safeParse(req.query);
    if (!p.success) return reply.code(422).send({ error: "dados_invalidos", detalhes: p.error.flatten() });
    if (negarSeNaoVinculado(reply, req.user.alunos ?? [], p.data.pesCodAluno)) return;
    return reply.send(await diasFrequencia(p.data.pesCodAluno, p.data.ano, p.data.mes));
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace app/api-siediario`
Expected: 0 erros.

- [ ] **Step 4: Verificar `/frequencia/resumo` com JWT de teste**

Criar `scripts/_tmp_freq.mjs` no scratchpad com mint de JWT (HS256, secret `dev-super-secret-change-me-32-chars-min`, payload `{sub:"2ef7a815-069a-48ba-863e-aa6e30f7d1bf", usr_codigo:999999, cpf:"0", responsavel_nome:"T", alunos:[180154], iat, exp}`), GET `http://localhost:3335/frequencia/resumo?pesCodAluno=180154&ano=2026`.
Run: `node scripts/_tmp_freq.mjs`
Expected: HTTP 200; `geral.total=88`, `presencas=85`, `faltas=2`, `justificadas=1`, `percentual≈96.6`, `minimo=80`, `status="em_dia"`; `porDisciplina` com Ed. Física abaixo; `porPeriodo` com ordem 2.

- [ ] **Step 5: Commit**

```bash
git add app/api-siediario/src/modules/frequencia/frequencia.service.ts app/api-siediario/src/modules/frequencia/frequencia.routes.ts
git commit -m "feat(frequencia): endpoints resumo + dias no api-siediario"
```

---

### Task 4: Verificação do `/frequencia/dias`

**Files:**
- (nenhum novo — valida a rota da Task 3)

**Interfaces:**
- Consumes: `GET /frequencia/dias` (Task 3).

- [ ] **Step 1: Verificar `/frequencia/dias` (junho)**

GET `http://localhost:3335/frequencia/dias?pesCodAluno=180154&ano=2026&mes=6` (mesmo mint da Task 3).
Run: `node scripts/_tmp_freq.mjs` (ajustado para o segundo GET)
Expected: HTTP 200; array em ordem reversa (data desc); cada dia com `aulas[]` (tempo, disciplina, status, cor) e `resumo`; dia 12 e 19 com 1 `falta` (Ed. Física), dia 10 com 1 `justificada` (Português).

- [ ] **Step 2: Remover script temporário**

Run: `rm scripts/_tmp_freq.mjs` (estava no scratchpad — nada a commitar).

---

### Task 5: Mobile — reescrever `FrequenciaService`

**Files:**
- Modify: `app/mobile/src/services/frequencia/FrequenciaService.tsx` (substitui todo o conteúdo)

**Interfaces:**
- Consumes: `apiNotifications`.
- Produces: tipos `ResumoFrequencia`, `DiaPresenca` + `getResumoFrequencia(pesCod, ano)` e `getDiasFrequencia(pesCod, ano, mes)`.

- [ ] **Step 1: Reescrever o service**

`app/mobile/src/services/frequencia/FrequenciaService.tsx`:
```tsx
import { apiNotifications } from '../apiNotifications';

export type StatusGeral = 'em_dia' | 'atencao' | 'risco';
export type RegistroStatus = 'presente' | 'falta' | 'justificada';

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

export async function getResumoFrequencia(pesCod: number, ano: number): Promise<ResumoFrequencia> {
    const response = await apiNotifications.get<ResumoFrequencia>('/frequencia/resumo', {
        params: { pesCodAluno: pesCod, ano },
    });
    return response.data;
}

export async function getDiasFrequencia(pesCod: number, ano: number, mes: number): Promise<DiaPresenca[]> {
    const response = await apiNotifications.get<DiaPresenca[]>('/frequencia/dias', {
        params: { pesCodAluno: pesCod, ano, mes },
    });
    return response.data;
}
```

- [ ] **Step 2: Typecheck (vai quebrar `FrequenciaScreen` — esperado, corrige na Task 6)**

Run: `cd app/mobile && npx tsc --noEmit 2>&1 | grep -i frequencia`
Expected: erros só em `FrequenciaScreen.tsx` (usa `getFrequenciaEscolar`/`CalendarioEscolar` removidos). Service em si sem erro.

- [ ] **Step 3: Commit (junto com Task 6 — service+tela mudam juntos)**

Pular commit isolado; commitar ao final da Task 6.

---

### Task 6: Mobile — `FrequenciaScreen` como dashboard

**Files:**
- Modify: `app/mobile/src/screens/frequencia/FrequenciaScreen.tsx` (substitui todo o conteúdo)

**Interfaces:**
- Consumes: `getResumoFrequencia`, `ResumoFrequencia` (Task 5); `useAluno`, `Header`, `AlunoCard`, `colors`; navega para `'FrequenciaDiariaScreen'` (Task 7).
- Produces: tela default-export `FrequenciaScreen`.

- [ ] **Step 1: Escrever o dashboard**

`app/mobile/src/screens/frequencia/FrequenciaScreen.tsx`:
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Header } from '../../components/Header';
import { AlunoCard } from '../../components/AlunoCard';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { useAluno } from '../../context/AlunoContext';
import { getResumoFrequencia, ResumoFrequencia, StatusGeral } from '../../services/frequencia/FrequenciaService';
import type { AppTabParamList } from '../../navigation/AppTabs';

const STATUS_INFO: Record<StatusGeral, { label: string; cor: string; bg: string; icon: any }> = {
    em_dia: { label: 'Frequência em dia', cor: '#16a34a', bg: '#dcfce7', icon: 'check-circle' },
    atencao: { label: 'Atenção à frequência', cor: '#d97706', bg: '#fef3c7', icon: 'alert-triangle' },
    risco: { label: 'Risco de reprovação por falta', cor: '#dc2626', bg: '#fee2e2', icon: 'alert-octagon' },
};

function HeroCard({ geral }: { geral: ResumoFrequencia['geral'] }) {
    const s = STATUS_INFO[geral.status];
    return (
        <View className="mx-4 mt-4 bg-white rounded-2xl border border-slate-200 p-5 items-center" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Frequência geral</Text>
            <Text style={{ color: s.cor }} className="text-5xl font-extrabold">{geral.percentual.toFixed(1)}%</Text>
            <View className="w-full h-2.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <View style={{ width: `${Math.min(100, geral.percentual)}%`, backgroundColor: s.cor }} className="h-full rounded-full" />
            </View>
            <Text className="text-slate-400 text-[11px] mt-1.5">mínimo exigido: {geral.minimo}%</Text>
            <View style={{ backgroundColor: s.bg }} className="flex-row items-center px-3 py-1.5 rounded-full mt-3">
                <Feather name={s.icon} size={14} color={s.cor} />
                <Text style={{ color: s.cor }} className="text-xs font-bold ml-1.5">{s.label}</Text>
            </View>
        </View>
    );
}

function Totais({ geral }: { geral: ResumoFrequencia['geral'] }) {
    const itens = [
        { label: 'Presenças', valor: geral.presencas, cor: '#16a34a' },
        { label: 'Faltas', valor: geral.faltas, cor: '#dc2626' },
        { label: 'Justificadas', valor: geral.justificadas, cor: '#d97706' },
    ];
    return (
        <View className="mx-4 mt-3 flex-row" style={{ gap: 10 }}>
            {itens.map((i) => (
                <View key={i.label} className="flex-1 bg-white rounded-2xl border border-slate-200 p-3 items-center">
                    <Text style={{ color: i.cor }} className="text-2xl font-extrabold">{i.valor}</Text>
                    <Text className="text-slate-500 text-[11px] font-semibold mt-0.5">{i.label}</Text>
                </View>
            ))}
        </View>
    );
}

function BarraDisciplina({ nome, percentual, faltas, abaixo }: { nome: string; percentual: number; faltas: number; abaixo: boolean }) {
    const cor = abaixo ? '#dc2626' : '#16a34a';
    return (
        <View className="mb-3">
            <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center flex-1 mr-2">
                    {abaixo && <Feather name="alert-triangle" size={12} color="#dc2626" />}
                    <Text className="text-slate-700 text-sm font-semibold ml-1" numberOfLines={1}>{nome}</Text>
                </View>
                <Text style={{ color: cor }} className="text-sm font-bold">{percentual.toFixed(0)}%</Text>
            </View>
            <View className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <View style={{ width: `${Math.min(100, percentual)}%`, backgroundColor: cor }} className="h-full rounded-full" />
            </View>
            {faltas > 0 && <Text className="text-slate-400 text-[10px] mt-0.5">{faltas} falta{faltas > 1 ? 's' : ''}</Text>}
        </View>
    );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <View className="mx-4 mt-4 bg-white rounded-2xl border border-slate-200 p-4">
            <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-3">{titulo}</Text>
            {children}
        </View>
    );
}

function DashboardSkeleton() {
    return (
        <View className="px-4 mt-4" style={{ gap: 12 }}>
            <Skeleton width="100%" height={180} borderRadius={16} />
            <Skeleton width="100%" height={70} borderRadius={16} />
            <Skeleton width="100%" height={160} borderRadius={16} />
        </View>
    );
}

export default function FrequenciaScreen() {
    const { aluno } = useAluno();
    const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
    const [resumo, setResumo] = useState<ResumoFrequencia | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ano = aluno?.ano_selecionado ?? new Date().getFullYear();

    const fetch = useCallback(async () => {
        if (!aluno) return;
        setError(null);
        try {
            setResumo(await getResumoFrequencia(aluno.pes_cod, ano));
        } catch {
            setError('Não foi possível carregar a frequência.');
        } finally {
            setLoading(false);
        }
    }, [aluno, ano]);

    useEffect(() => { fetch(); }, [fetch]);

    const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

    const semDados = resumo && resumo.geral.total === 0;

    return (
        <View className="flex-1 bg-slate-150">
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <View className="flex-1">
                <Header title="Frequência" showBack={true} />
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.edu.primary]} tintColor={colors.edu.primary} />}
                    showsVerticalScrollIndicator={false}
                >
                    <AlunoCard alunoAtual={aluno!} />

                    {loading && !refreshing ? (
                        <DashboardSkeleton />
                    ) : error ? (
                        <View className="mx-4 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 items-center">
                            <Feather name="alert-triangle" size={24} color="#F59E0B" />
                            <Text className="text-amber-800 font-bold mt-2">Ops! Algo deu errado</Text>
                            <TouchableOpacity onPress={fetch} className="mt-4 px-6 py-2 rounded-xl" style={{ backgroundColor: colors.edu.primary }}>
                                <Text className="text-white font-bold">Tentar Novamente</Text>
                            </TouchableOpacity>
                        </View>
                    ) : !resumo || semDados ? (
                        <View className="mx-4 mt-6 bg-white border border-slate-200 rounded-2xl p-8 items-center">
                            <View className="w-14 h-14 bg-slate-100 rounded-2xl items-center justify-center mb-3">
                                <Feather name="check-square" size={26} color="#94a3b8" />
                            </View>
                            <Text className="text-slate-700 font-bold text-base">Sem registros de frequência</Text>
                            <Text className="text-slate-400 text-sm text-center mt-1">Ainda não há aulas com presença lançada neste ano.</Text>
                        </View>
                    ) : (
                        <>
                            <HeroCard geral={resumo.geral} />
                            <Totais geral={resumo.geral} />

                            {resumo.porDisciplina.length > 0 && (
                                <Secao titulo="Por disciplina">
                                    {resumo.porDisciplina.map((d) => (
                                        <BarraDisciplina key={d.disciplina} nome={d.disciplina} percentual={d.percentual} faltas={d.faltas} abaixo={d.abaixoMinimo} />
                                    ))}
                                </Secao>
                            )}

                            {resumo.porPeriodo.length > 0 && (
                                <Secao titulo="Por período">
                                    {resumo.porPeriodo.map((p) => (
                                        <BarraDisciplina key={p.ordem} nome={p.nome} percentual={p.percentual} faltas={p.faltas} abaixo={p.percentual < resumo.geral.minimo} />
                                    ))}
                                </Secao>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('FrequenciaDiariaScreen')}
                                className="mx-4 mt-4 bg-white rounded-2xl border border-slate-200 p-4 flex-row items-center justify-between"
                            >
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
                                        <Feather name="list" size={18} color={colors.edu.primary} />
                                    </View>
                                    <Text className="text-slate-700 font-bold text-sm ml-3">Presença dia a dia</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
```

- [ ] **Step 2: Typecheck (vai faltar a rota `FrequenciaDiariaScreen` no ParamList até a Task 7)**

Run: `cd app/mobile && npx tsc --noEmit 2>&1 | grep -i "frequencia/FrequenciaScreen"`
Expected: pode acusar `FrequenciaDiariaScreen` ausente no `AppTabParamList` — resolvido na Task 7. Sem outros erros.

- [ ] **Step 3: Commit (junto com Task 7)**

Pular; commitar ao final da Task 7 (telas + navegação juntas).

---

### Task 7: Mobile — `FrequenciaDiariaScreen` + registro de navegação

**Files:**
- Create: `app/mobile/src/screens/frequencia/FrequenciaDiariaScreen.tsx`
- Modify: `app/mobile/src/navigation/AppTabs.tsx`

**Interfaces:**
- Consumes: `getDiasFrequencia`, `DiaPresenca` (Task 5).
- Produces: tela `FrequenciaDiariaScreen`; entrada `'FrequenciaDiariaScreen'` no `AppTabParamList`.

- [ ] **Step 1: Criar a sub-tela diária**

`app/mobile/src/screens/frequencia/FrequenciaDiariaScreen.tsx`:
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { Header } from '../../components/Header';
import { Skeleton } from '../../components/Skeleton';
import { colors } from '../../constants/colors';
import { useAluno } from '../../context/AlunoContext';
import { getDiasFrequencia, DiaPresenca, RegistroStatus } from '../../services/frequencia/FrequenciaService';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIA_ABBR = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']; // index = dia_semana-1
const ICON_STATUS: Record<RegistroStatus, { icon: any; cor: string; label: string }> = {
    presente: { icon: 'check', cor: '#16a34a', label: 'Presente' },
    falta: { icon: 'x', cor: '#dc2626', label: 'Falta' },
    justificada: { icon: 'shield', cor: '#d97706', label: 'Justificada' },
};

function fmtDiaData(iso: string, diaSemana: number): string {
    const [, m, d] = iso.split('-');
    return `${DIA_ABBR[diaSemana - 1] ?? ''} · ${d}/${m}`;
}

function CardDia({ dia }: { dia: DiaPresenca }) {
    return (
        <View className="bg-white rounded-2xl border border-slate-200 mb-3 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <Text className="text-slate-700 font-bold text-sm">{fmtDiaData(dia.data, dia.dia_semana)}</Text>
                <Text className="text-slate-500 text-xs font-semibold">{dia.resumo.presencas}/{dia.resumo.total} presenças</Text>
            </View>
            <View className="px-4 py-2">
                {dia.aulas.map((a, i) => {
                    const s = ICON_STATUS[a.status];
                    return (
                        <View key={`${a.tempo}-${i}`} className="flex-row items-center py-2">
                            <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: `${s.cor}1a` }}>
                                <Feather name={s.icon} size={13} color={s.cor} />
                            </View>
                            <Text className="text-slate-400 text-[11px] font-bold w-7 ml-2">{a.tempo}º</Text>
                            <Text className="text-slate-700 text-sm flex-1" numberOfLines={1}>{a.disciplina}</Text>
                            <Text style={{ color: s.cor }} className="text-[11px] font-bold">{s.label}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

export default function FrequenciaDiariaScreen() {
    const { aluno } = useAluno();
    const [mes, setMes] = useState(new Date().getMonth()); // 0-11
    const [dias, setDias] = useState<DiaPresenca[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const ano = aluno?.ano_selecionado ?? new Date().getFullYear();

    const fetch = useCallback(async () => {
        if (!aluno) return;
        setLoading(true);
        try {
            setDias(await getDiasFrequencia(aluno.pes_cod, ano, mes + 1));
        } catch {
            setDias([]);
        } finally {
            setLoading(false);
        }
    }, [aluno, ano, mes]);

    useEffect(() => { fetch(); }, [fetch]);

    const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

    return (
        <View className="flex-1 bg-slate-150">
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <View className="flex-1">
                <Header title="Presença Diária" showBack={true} />

                {/* Seletor de mês — chips horizontais, não grid */}
                <View className="bg-white border-b border-slate-100">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
                        {MESES.map((m, i) => {
                            const ativo = i === mes;
                            return (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setMes(i)}
                                    className="px-4 py-2 rounded-full"
                                    style={{ backgroundColor: ativo ? colors.edu.primary : '#f1f5f9' }}
                                >
                                    <Text className="text-xs font-bold" style={{ color: ativo ? '#fff' : '#64748b' }}>{m}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.edu.primary]} tintColor={colors.edu.primary} />}
                    showsVerticalScrollIndicator={false}
                >
                    {loading && !refreshing ? (
                        <View style={{ gap: 12 }}>
                            <Skeleton width="100%" height={120} borderRadius={16} />
                            <Skeleton width="100%" height={120} borderRadius={16} />
                        </View>
                    ) : dias.length === 0 ? (
                        <View className="bg-white border border-slate-200 rounded-2xl p-8 items-center mt-4">
                            <View className="w-14 h-14 bg-slate-100 rounded-2xl items-center justify-center mb-3">
                                <Feather name="calendar" size={26} color="#94a3b8" />
                            </View>
                            <Text className="text-slate-700 font-bold text-base">Sem aulas em {MESES[mes]}</Text>
                            <Text className="text-slate-400 text-sm text-center mt-1">Nenhuma presença registrada neste mês.</Text>
                        </View>
                    ) : (
                        dias.map((d) => <CardDia key={d.data} dia={d} />)
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
```

- [ ] **Step 2: Registrar no `AppTabs`**

`app/mobile/src/navigation/AppTabs.tsx` — adicionar import, entrada no ParamList e `Tab.Screen`:

Import (após linha 14):
```tsx
import FrequenciaDiariaScreen from '../screens/frequencia/FrequenciaDiariaScreen';
```
ParamList (adicionar entrada antes do fechamento, após `AutorizacoesScreen: undefined;`):
```tsx
  FrequenciaDiariaScreen: undefined;
```
Tab.Screen (após a linha do `FrequenciaScreen`):
```tsx
      <Tab.Screen name="FrequenciaDiariaScreen" component={FrequenciaDiariaScreen} />
```

- [ ] **Step 3: Typecheck**

Run: `cd app/mobile && npx tsc --noEmit 2>&1 | grep -i frequencia`
Expected: sem erros em arquivos de frequência (pré-existentes não-frequência podem ficar).

- [ ] **Step 4: Smoke test no app**

Com `adb reverse tcp:3335 tcp:3335` ativo e logado como responsável demo (CPF 12345678901): abrir Frequência → dashboard com % geral, totais, por disciplina, por período → tocar "Presença dia a dia" → lista de junho com cards-dia (presente/falta/justificada). Trocar mês nos chips.

- [ ] **Step 5: Commit**

```bash
git add app/mobile/src/services/frequencia/FrequenciaService.tsx app/mobile/src/screens/frequencia/FrequenciaScreen.tsx app/mobile/src/screens/frequencia/FrequenciaDiariaScreen.tsx app/mobile/src/navigation/AppTabs.tsx
git commit -m "feat(frequencia): dashboard global + tela de presenca diaria no mobile"
```

---

## Notas de execução

- A tela mobile antiga não tem testes; a verificação é via endpoint real (JWT de teste) + smoke no app — padrão do projeto.
- Funções de cálculo puras (Task 1) são o núcleo testável; o restante é I/O verificado por evidência real.
- Seed (Task 2) é dado de **demo permanente** (não limpar).
