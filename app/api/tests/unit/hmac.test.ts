import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { computeHmac, verifyHmac, isTimestampFresh } from '../../src/lib/hmac.js';

const SECRET = 'a'.repeat(32);

describe('computeHmac', () => {
  it('produz HMAC-SHA256 hex determinístico', () => {
    const sig = computeHmac(SECRET, '1730928000', '{"foo":"bar"}');
    const expected = crypto
      .createHmac('sha256', SECRET)
      .update('1730928000.{"foo":"bar"}')
      .digest('hex');
    expect(sig).toBe(expected);
  });
});

describe('verifyHmac', () => {
  it('retorna true para assinatura válida', () => {
    const ts = '1730928000';
    const body = '{"a":1}';
    const sig = `sha256=${computeHmac(SECRET, ts, body)}`;
    expect(verifyHmac(SECRET, ts, body, sig)).toBe(true);
  });

  it('retorna false para body adulterado', () => {
    const ts = '1730928000';
    const sig = `sha256=${computeHmac(SECRET, ts, '{"a":1}')}`;
    expect(verifyHmac(SECRET, ts, '{"a":2}', sig)).toBe(false);
  });

  it('retorna false sem prefixo sha256=', () => {
    const ts = '1730928000';
    const body = '{"a":1}';
    const sig = computeHmac(SECRET, ts, body);
    expect(verifyHmac(SECRET, ts, body, sig)).toBe(false);
  });

  it('retorna false para assinatura malformada', () => {
    expect(verifyHmac(SECRET, '1730928000', '{}', 'garbage')).toBe(false);
  });
});

describe('isTimestampFresh', () => {
  it('retorna true dentro de janela 5min', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTimestampFresh(String(now))).toBe(true);
    expect(isTimestampFresh(String(now - 100))).toBe(true);
  });

  it('retorna false fora da janela 5min', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTimestampFresh(String(now - 301))).toBe(false);
    expect(isTimestampFresh(String(now + 301))).toBe(false);
  });

  it('retorna false para timestamp não-numérico', () => {
    expect(isTimestampFresh('abc')).toBe(false);
  });
});
