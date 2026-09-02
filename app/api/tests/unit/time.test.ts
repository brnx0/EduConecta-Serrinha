import { describe, it, expect } from 'vitest';
import { formatHora, capitalize } from '../../src/lib/time.js';

describe('formatHora', () => {
  it('formata Date como HH:mm em pt-BR', () => {
    const d = new Date('2026-05-06T07:32:15.000-03:00');
    expect(formatHora(d, 'America/Sao_Paulo')).toBe('07:32');
  });

  it('zero-pad nos minutos', () => {
    const d = new Date('2026-05-06T15:05:00.000-03:00');
    expect(formatHora(d, 'America/Sao_Paulo')).toBe('15:05');
  });
});

describe('capitalize', () => {
  it('capitaliza primeira letra', () => {
    expect(capitalize('entrada')).toBe('Entrada');
    expect(capitalize('saida')).toBe('Saida');
  });

  it('retorna string vazia para input vazio', () => {
    expect(capitalize('')).toBe('');
  });
});
