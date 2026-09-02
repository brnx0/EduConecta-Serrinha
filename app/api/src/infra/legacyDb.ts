import sql from 'mssql';
import { config } from '../config.js';

/**
 * Pool de conexão pro banco legado Softwell (EDU_*).
 * Leitura de tabelas como GER_PESSOA_FISICA, EDU_ALUNO, etc.
 *
 * Conexão diferente do Prisma (que aponta pro EDC_* — banco do app).
 * Usa o connection string parser do mssql.
 */

function parseSqlServerUrl(url: string): sql.config {
  // sqlserver://host:port;database=...;user=...;password=...;encrypt=...;trustServerCertificate=...
  const m = url.match(/^sqlserver:\/\/([^:;]+)(?::(\d+))?;(.+)$/);
  if (!m) throw new Error(`LEGACY_DATABASE_URL malformada: ${url}`);
  const [, host, port, paramsStr] = m;
  const params: Record<string, string> = {};
  for (const part of paramsStr.split(';')) {
    if (!part.trim()) continue;
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    params[k.toLowerCase()] = v;
  }
  return {
    server: host,
    port: port ? Number(port) : 1433,
    database: params['database'],
    user: params['user'],
    password: params['password'],
    options: {
      encrypt: params['encrypt'] === 'true',
      trustServerCertificate: params['trustservercertificate'] === 'true',
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 15000,
  };
}

let _pool: sql.ConnectionPool | null = null;
let _connectingPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Retorna pool conectado. Lazy + idempotente.
 */
export async function getLegacyPool(): Promise<sql.ConnectionPool> {
  if (_pool && _pool.connected) return _pool;
  if (_connectingPromise) return _connectingPromise;

  _connectingPromise = (async () => {
    const cfg = parseSqlServerUrl(config.LEGACY_DATABASE_URL);
    _pool = new sql.ConnectionPool(cfg);
    await _pool.connect();
    return _pool;
  })();

  try {
    return await _connectingPromise;
  } finally {
    _connectingPromise = null;
  }
}

export async function closeLegacyPool(): Promise<void> {
  if (_pool) {
    await _pool.close();
    _pool = null;
  }
}
