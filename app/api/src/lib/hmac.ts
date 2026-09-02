import crypto from 'node:crypto';

const FIVE_MIN_SECONDS = 5 * 60;

/**
 * Calcula HMAC-SHA256 sobre `${timestamp}.${body}` e retorna em hex.
 */
export function computeHmac(
  secret: string,
  timestamp: string,
  body: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}

/**
 * Verifica assinatura no formato `sha256=<hex>` em tempo constante.
 */
export function verifyHmac(
  secret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  if (typeof signature !== 'string') return false;
  if (!signature.startsWith('sha256=')) return false;

  const provided = signature.slice('sha256='.length);
  const expected = computeHmac(secret, timestamp, body);

  if (provided.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Valida que `timestamp` (segundos Unix) está dentro de janela de 5 minutos.
 */
export function isTimestampFresh(
  timestamp: string,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(nowSec - ts) <= FIVE_MIN_SECONDS;
}
