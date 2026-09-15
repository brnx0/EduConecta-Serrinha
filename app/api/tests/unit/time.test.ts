import { describe, it, expect } from 'vitest';
import { formatHora, capitalize, isDataPassadaValida } from '../../src/lib/time.js';

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

describe('isDataPassadaValida', () => {
  const agora = new Date('2026-09-11T12:00:00.000Z');

  it('aceita data passada que existe', () => {
    expect(isDataPassadaValida('2020-02-29', agora)).toBe(true); // bissexto
    expect(isDataPassadaValida('2015-07-15', agora)).toBe(true);
  });

  it('aceita hoje', () => {
    expect(isDataPassadaValida('2026-09-11', agora)).toBe(true);
  });

  it('rejeita data que não existe no calendário', () => {
    expect(isDataPassadaValida('2020-02-31', agora)).toBe(false);
    expect(isDataPassadaValida('2021-02-29', agora)).toBe(false); // não bissexto
    expect(isDataPassadaValida('9999-99-99', agora)).toBe(false);
    expect(isDataPassadaValida('2020-00-10', agora)).toBe(false);
  });

  it('rejeita data futura', () => {
    expect(isDataPassadaValida('3030-01-01', agora)).toBe(false);
    expect(isDataPassadaValida('2026-09-12', agora)).toBe(false);
  });

  it('rejeita antes de 1900 e formato errado', () => {
    expect(isDataPassadaValida('1899-12-31', agora)).toBe(false);
    expect(isDataPassadaValida('11/09/2020', agora)).toBe(false);
  });
});
