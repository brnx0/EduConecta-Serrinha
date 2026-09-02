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
