import { describe, it, expect } from 'vitest';
import { agruparDias, consolidarResumo, faixaStatus, pct } from '../../src/lib/frequencia.js';
import type { LinhaAula } from '../../src/domain/frequencia.js';

describe('pct', () => {
  it('arredonda em 1 casa', () => expect(pct(2, 3)).toBe(66.7));
  it('total 0 → 0', () => expect(pct(0, 0)).toBe(0));
});

describe('faixaStatus', () => {
  it('≥ mínimo → em_dia', () => expect(faixaStatus(75, 75)).toBe('em_dia'));
  it('até 5 abaixo → atencao', () => expect(faixaStatus(70, 75)).toBe('atencao'));
  it('mais de 5 abaixo → risco', () => expect(faixaStatus(69.9, 75)).toBe('risco'));
});

const linhas: LinhaAula[] = [
  { data: '2026-03-10', tempo: 2, disciplina: 'Matemática', status: 'presente', unidade: 1 },
  { data: '2026-03-10', tempo: 1, disciplina: 'Português', status: 'falta', unidade: 1 },
  { data: '2026-03-11', tempo: 1, disciplina: 'Português', status: 'presente', unidade: 1 },
  { data: '2026-06-02', tempo: 1, disciplina: 'Matemática', status: 'justificada', unidade: 2 },
];

describe('consolidarResumo', () => {
  const r = consolidarResumo(linhas, [
    { ordem: 1, nome: '1º Trimestre' },
    { ordem: 2, nome: '2º Trimestre' },
    { ordem: 3, nome: '3º Trimestre' },
  ], 75);

  it('justificada entra no total mas não é presença', () => {
    expect(r.geral).toMatchObject({ total: 4, presencas: 2, faltas: 1, justificadas: 1, percentual: 50, status: 'risco' });
  });

  it('agrupa por disciplina em ordem alfabética', () => {
    expect(r.porDisciplina.map((d) => d.disciplina)).toEqual(['Matemática', 'Português']);
    expect(r.porDisciplina[1]).toMatchObject({ total: 2, presencas: 1, percentual: 50, abaixoMinimo: true });
  });

  it('só períodos com aula, na ordem do calendário', () => {
    expect(r.porPeriodo.map((p) => [p.ordem, p.total])).toEqual([[1, 3], [2, 1]]);
  });

  it('sem linhas → zerado', () => {
    expect(consolidarResumo([], [], 75).geral).toMatchObject({ total: 0, percentual: 0 });
  });
});

describe('agruparDias', () => {
  const dias = agruparDias(linhas);

  it('mais recente primeiro', () => {
    expect(dias.map((d) => d.data)).toEqual(['2026-06-02', '2026-03-11', '2026-03-10']);
  });

  it('aulas ordenadas por tempo, com resumo e cor', () => {
    const d = dias[2];
    expect(d.aulas.map((a) => a.tempo)).toEqual([1, 2]);
    expect(d.resumo).toEqual({ total: 2, presencas: 1, faltas: 1, justificadas: 0 });
    expect(d.aulas[0].cor).toBe('#ef4444');
  });

  it('dia_semana 1=Dom..7=Sáb', () => {
    expect(dias[2].dia_semana).toBe(3); // 10/03/2026 = terça
  });
});
