import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Carrega .env do app/api/ com override sobre vars de shell
// (shell pode ter DATABASE_URL apontando pra outro banco)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().min(1),
  // Banco legado Softwell (EDU_*) — leitura de Pessoa/Aluno via mssql pool
  LEGACY_DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  FR_WEBHOOK_SECRET: z
    .string()
    .min(32, 'FR_WEBHOOK_SECRET deve ter no mínimo 32 caracteres'),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  // SMTP — usado por lib/email.ts (recuperar senha etc.).
  // Em dev, se SMTP_HOST vazio, e-mails são logados no console.
  // Em prod, validação de envio falha se ausente.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export const config = envSchema.parse(process.env);

export type Config = z.infer<typeof envSchema>;
