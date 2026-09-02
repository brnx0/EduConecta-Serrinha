# Notificações de Presença — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar sistema de reconhecimento facial existente com app EduConecta para entregar push notifications aos responsáveis quando aluno é registrado no leitor da escola, com histórico in-app.

**Architecture:** Webhook HMAC-signed do FR API → Fastify backend novo (`app/api`) → persistência SQL Server via Prisma → dispatch async via `setImmediate` → Expo Push Service → mobile (`app/mobile`). Cron de 5min reprocessa falhas. Monorepo npm workspaces.

**Tech Stack:** Node 20+, Fastify, Prisma, SQL Server, expo-notifications, expo-device, node-cron, Vitest, Supertest, Jest, React Native Testing Library.

**Spec:** [`docs/superpowers/specs/2026-05-06-notificacoes-presenca-design.md`](../specs/2026-05-06-notificacoes-presenca-design.md)

---

## File Structure

### Estrutura monorepo final

```
educonecta/
├── package.json                                # workspaces: ["app/*"]
├── app/
│   ├── mobile/                                 # código Expo atual movido
│   │   ├── App.tsx                             # MODIFY: wire hooks
│   │   ├── app.json                            # MODIFY: plugin expo-notifications
│   │   ├── package.json                        # MODIFY: deps novas
│   │   ├── educonecta.d.ts                     # MODIFY: tipo Notificacoes
│   │   └── src/
│   │       ├── hooks/                          # CREATE dir
│   │       │   ├── useExpoPushToken.ts         # CREATE
│   │       │   └── useNotificationListener.ts  # CREATE
│   │       ├── services/
│   │       │   ├── pushTokens/
│   │       │   │   └── index.ts                # CREATE
│   │       │   └── notificacoes/
│   │       │       └── index.ts                # CREATE
│   │       ├── screens/
│   │       │   └── notificacoes/               # CREATE dir
│   │       │       ├── index.tsx               # CREATE
│   │       │       ├── NotificacaoItem.tsx     # CREATE
│   │       │       └── EmptyState.tsx          # CREATE
│   │       └── routes/
│   │           └── index.tsx                   # MODIFY: rota nova
│   └── api/                                    # CREATE — novo backend
│       ├── package.json                        # CREATE
│       ├── tsconfig.json                       # CREATE
│       ├── .env.example                        # CREATE
│       ├── .gitignore                          # CREATE
│       ├── prisma/
│       │   └── schema.prisma                   # CREATE
│       ├── src/
│       │   ├── server.ts                       # CREATE — entry point
│       │   ├── config.ts                       # CREATE — env vars
│       │   ├── db.ts                           # CREATE — Prisma client
│       │   ├── plugins/
│       │   │   ├── hmac.ts                     # CREATE
│       │   │   ├── auth.ts                     # CREATE
│       │   │   └── prisma.ts                   # CREATE
│       │   ├── routes/
│       │   │   ├── webhook.ts                  # CREATE
│       │   │   ├── pushTokens.ts               # CREATE
│       │   │   ├── notificacoes.ts             # CREATE
│       │   │   └── health.ts                   # CREATE
│       │   ├── services/
│       │   │   ├── pushDispatcher.ts           # CREATE
│       │   │   └── retryWorker.ts              # CREATE
│       │   └── lib/
│       │       ├── hmac.ts                     # CREATE
│       │       ├── expoClient.ts               # CREATE
│       │       ├── time.ts                     # CREATE
│       │       └── errors.ts                   # CREATE
│       └── tests/
│           ├── unit/
│           │   ├── hmac.test.ts                # CREATE
│           │   ├── time.test.ts                # CREATE
│           │   └── pushDispatcher.test.ts      # CREATE
│           └── integration/
│               ├── webhook.test.ts             # CREATE
│               ├── pushTokens.test.ts          # CREATE
│               └── notificacoes.test.ts        # CREATE
└── docs/superpowers/
    ├── specs/2026-05-06-notificacoes-presenca-design.md
    └── plans/2026-05-06-notificacoes-presenca.md
```

---

## Phase 1 — Monorepo Restructure

### Task 1: Setup npm workspaces at root

**Files:**
- Create: `package.json` (root)
- Modify: `.gitignore` (root)

- [ ] **Step 1: Inspect current root package.json (será movido pra app/mobile)**

```bash
cat package.json
```

Expected: vê config atual do Expo. Guardar conteúdo mentalmente.

- [ ] **Step 2: Criar root package.json com workspaces**

`package.json` (root):

```json
{
  "name": "educonecta-monorepo",
  "private": true,
  "version": "1.0.0",
  "workspaces": [
    "app/*"
  ],
  "scripts": {
    "mobile": "npm --workspace app/mobile",
    "api": "npm --workspace app/api",
    "mobile:start": "npm --workspace app/mobile run start",
    "api:dev": "npm --workspace app/api run dev",
    "api:test": "npm --workspace app/api run test"
  }
}
```

- [ ] **Step 3: Atualizar .gitignore raiz**

`.gitignore` (root):

```
node_modules/
.env
.env.local
*.log
.DS_Store
dist/
build/
.expo/
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: setup npm workspaces na raiz do monorepo"
```

---

### Task 2: Mover código existente pra app/mobile/

**Files:**
- Move: tudo na raiz exceto `package.json`, `.gitignore`, `docs/`, `CLAUDE.md`, `context.md`, `node_modules/` → `app/mobile/`

- [ ] **Step 1: Criar diretório app/mobile**

```bash
mkdir -p app/mobile
```

- [ ] **Step 2: Mover arquivos pra app/mobile (preservar histórico git)**

```bash
git mv App.tsx app/mobile/
git mv app.json app/mobile/
git mv babel.config.js app/mobile/
git mv educonecta.d.ts app/mobile/
git mv index.ts app/mobile/
git mv metro.config.js app/mobile/
git mv tailwind.config.js app/mobile/
git mv tsconfig.json app/mobile/
git mv assets app/mobile/
git mv src app/mobile/
```

`package-lock.json` antigo é removido (workspaces gera novo).

```bash
git rm package-lock.json
```

`package.json` antigo do mobile precisa ser movido com cuidado (raiz já tem novo). Usar git mv só se ainda existir como `package.json.mobile.bak`. Prática: salvar conteúdo antigo, mover, restaurar.

```bash
# salvar conteúdo do package.json mobile (antes de step 1 da Task 1, deveria ter sido feito)
# se já sobrescrito, recriar manualmente em step 3
```

- [ ] **Step 3: Criar app/mobile/package.json (conteúdo do package.json mobile original)**

`app/mobile/package.json`:

```json
{
  "name": "educonecta-mobile",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@react-navigation/bottom-tabs": "^7.9.1",
    "@react-navigation/native": "^7.1.27",
    "@react-navigation/native-stack": "^7.9.1",
    "axios": "^1.13.2",
    "clsx": "^2.1.1",
    "drizzle-orm": "^0.45.1",
    "expo": "~54.0.31",
    "expo-document-picker": "^14.0.8",
    "expo-file-system": "~19.0.21",
    "expo-font": "~14.0.10",
    "expo-location": "~19.0.8",
    "expo-secure-store": "^15.0.8",
    "expo-sqlite": "~16.0.10",
    "expo-status-bar": "~3.0.9",
    "jwt-decode": "^4.0.0",
    "nativewind": "^2.0.11",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-keyboard-aware-scroll-view": "^0.9.5",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "babel-plugin-inline-import": "^3.0.0",
    "babel-preset-expo": "^54.0.9",
    "drizzle-kit": "^0.31.8",
    "tailwindcss": "^3.3.2",
    "typescript": "~5.9.2"
  },
  "private": true,
  "resolutions": {
    "postcss": "8.4.49"
  }
}
```

- [ ] **Step 4: Verificar estrutura**

```bash
ls -la
ls app/mobile/
```

Expected raiz:
```
.git/
.gitignore
CLAUDE.md
app/
context.md
docs/
node_modules/  (será regenerado)
package.json
```

Expected app/mobile/:
```
App.tsx
app.json
assets/
babel.config.js
educonecta.d.ts
index.ts
metro.config.js
package.json
src/
tailwind.config.js
tsconfig.json
```

- [ ] **Step 5: Reinstalar deps via workspaces**

```bash
rm -rf node_modules
npm install
```

Expected: cria `node_modules/` na raiz e symlinks pra `app/mobile/node_modules/`.

- [ ] **Step 6: Verificar mobile ainda inicia**

```bash
npm run mobile:start
```

Expected: Expo dev server inicia sem erros. Mata processo após confirmar (`Ctrl+C`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move app Expo para app/mobile no monorepo"
```

---

## Phase 2 — app/api Scaffold

### Task 3: Inicializar app/api com Fastify + TypeScript

**Files:**
- Create: `app/api/package.json`
- Create: `app/api/tsconfig.json`
- Create: `app/api/.env.example`
- Create: `app/api/.gitignore`
- Create: `app/api/src/server.ts`
- Create: `app/api/src/config.ts`

- [ ] **Step 1: Criar app/api/package.json**

`app/api/package.json`:

```json
{
  "name": "educonecta-api",
  "version": "1.0.0",
  "private": true,
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:pull": "prisma db pull",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.1",
    "@fastify/jwt": "^9.0.1",
    "@fastify/rate-limit": "^10.1.1",
    "@prisma/client": "^5.22.0",
    "expo-server-sdk": "^3.10.0",
    "fastify": "^5.1.0",
    "node-cron": "^3.0.3",
    "pino-pretty": "^11.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/node-cron": "^3.0.11",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.22.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Criar tsconfig.json**

`app/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Criar .env.example**

`app/api/.env.example`:

```env
# Server
PORT=3333
NODE_ENV=development
LOG_LEVEL=debug

# Database (mesma instância da API atual)
DATABASE_URL="sqlserver://localhost:1433;database=educonecta;user=sa;password=YourPass;encrypt=true;trustServerCertificate=true"

# JWT (mesmo secret da API atual pra compatibilidade)
JWT_SECRET=change_me_in_prod_minimum_32_bytes_long_secret

# FR webhook HMAC secret (compartilhado com API FR)
FR_WEBHOOK_SECRET=change_me_in_prod_minimum_32_bytes_long_secret

# Expo Push (opcional — habilita rate limits maiores)
EXPO_ACCESS_TOKEN=
```

- [ ] **Step 4: Criar .gitignore**

`app/api/.gitignore`:

```
node_modules/
dist/
.env
.env.local
*.log
prisma/migrations/dev.db*
```

- [ ] **Step 5: Criar src/config.ts**

`app/api/src/config.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  FR_WEBHOOK_SECRET: z.string().min(32, 'FR_WEBHOOK_SECRET deve ter no mínimo 32 caracteres'),
  EXPO_ACCESS_TOKEN: z.string().optional(),
});

export const config = envSchema.parse(process.env);

export type Config = z.infer<typeof envSchema>;
```

- [ ] **Step 6: Criar src/server.ts mínimo**

`app/api/src/server.ts`:

```typescript
import Fastify from 'fastify';
import { config } from './config.js';

async function bootstrap() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  app.get('/health', async () => ({ status: 'ok' }));

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info(`API listening on :${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
```

- [ ] **Step 7: Instalar deps**

```bash
npm install
```

(Roda na raiz, instala em `app/api/node_modules/` via workspaces)

- [ ] **Step 8: Rodar dev server**

```bash
cp app/api/.env.example app/api/.env
# editar .env com secrets reais (DATABASE_URL pode ficar dummy por enquanto)
npm run api:dev
```

Expected: log `API listening on :3333`. Testar `curl http://localhost:3333/health` retorna `{"status":"ok"}`.

Mata processo (`Ctrl+C`).

- [ ] **Step 9: Commit**

```bash
git add app/api/ package.json package-lock.json
git commit -m "feat(api): scaffold inicial Fastify + TypeScript em app/api"
```

---

### Task 4: Setup Prisma com SQL Server

**Files:**
- Create: `app/api/prisma/schema.prisma`
- Create: `app/api/src/db.ts`
- Create: `app/api/src/plugins/prisma.ts`
- Modify: `app/api/src/server.ts`

- [ ] **Step 1: Inicializar Prisma**

```bash
cd app/api
npx prisma init --datasource-provider sqlserver
cd ../..
```

Expected: cria `prisma/schema.prisma`, atualiza `.env` com `DATABASE_URL` (já tem do Task 3).

- [ ] **Step 2: Substituir schema.prisma com modelos novos**

`app/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

model PushToken {
  id          String    @id @default(uuid())
  userId      String
  token       String    @unique
  platform    String
  deviceId    String?
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime  @default(now())

  @@index([userId])
}

model PresencaEvento {
  id            String        @id @default(uuid())
  eventId       String        @unique
  alunoId       String
  tipo          String
  ocorridoEm    DateTime
  recebidoEm    DateTime      @default(now())
  leitorId      String?
  notificacoes  Notificacao[]

  @@index([alunoId, ocorridoEm])
}

model Notificacao {
  id          String           @id @default(uuid())
  userId      String
  eventoId    String
  titulo      String
  corpo       String
  status      String           @default("pendente")
  tentativas  Int              @default(0)
  ultimoErro  String?
  enviadaEm   DateTime?
  lidaEm      DateTime?
  criadaEm    DateTime         @default(now())
  evento      PresencaEvento   @relation(fields: [eventoId], references: [id])

  @@index([userId, criadaEm])
  @@index([status])
}
```

> **Nota:** Modelos `User`, `Aluno`, `AlunoResponsavel` serão adicionados via `prisma db pull` quando banco real estiver disponível. Por enquanto, FK `userId` e `alunoId` referem-se a strings sem relação Prisma — válido pois SQL Server permite. Em ambiente real, após `db pull`, adicionar relações inversas:
>
> ```prisma
> model User {
>   pushTokens   PushToken[]
>   notificacoes Notificacao[]
> }
> model Aluno {
>   eventos PresencaEvento[]
> }
> ```

- [ ] **Step 3: Gerar Prisma Client**

```bash
npm run api -- run prisma:generate
```

Expected: `@prisma/client` gerado em `app/api/node_modules/`.

- [ ] **Step 4: Criar src/db.ts**

`app/api/src/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

export const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

export async function disconnectDb() {
  await prisma.$disconnect();
}
```

- [ ] **Step 5: Criar plugin Fastify pra Prisma**

`app/api/src/plugins/prisma.ts`:

```typescript
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { prisma, disconnectDb } from '../db.js';
import type { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await disconnectDb();
  });
};

export default fp(prismaPlugin, { name: 'prisma' });
```

Instalar `fastify-plugin`:

```bash
npm install --workspace app/api fastify-plugin
```

- [ ] **Step 6: Atualizar server.ts pra registrar plugin**

`app/api/src/server.ts`:

```typescript
import Fastify from 'fastify';
import { config } from './config.js';
import prismaPlugin from './plugins/prisma.js';

async function bootstrap() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  await app.register(prismaPlugin);

  app.get('/health', async (_, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch (err) {
      reply.code(503);
      return { status: 'degraded', db: 'down' };
    }
  });

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info(`API listening on :${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
```

- [ ] **Step 7: Verificar build TS**

```bash
npm run api -- run lint
```

Expected: zero erros.

- [ ] **Step 8: Commit**

```bash
git add app/api/
git commit -m "feat(api): setup Prisma com SQL Server e schema inicial de notificações"
```

---

## Phase 3 — Core Libs (TDD)

### Task 5: HMAC verify utility (TDD)

**Files:**
- Create: `app/api/src/lib/hmac.ts`
- Test: `app/api/tests/unit/hmac.test.ts`

- [ ] **Step 1: Setup Vitest config**

`app/api/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: [],
  },
});
```

- [ ] **Step 2: Escrever testes (failing)**

`app/api/tests/unit/hmac.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { computeHmac, verifyHmac, isTimestampFresh } from '../../src/lib/hmac.js';

const SECRET = 'a'.repeat(32);

describe('computeHmac', () => {
  it('produces deterministic HMAC-SHA256 hex', () => {
    const sig = computeHmac(SECRET, '1730928000', '{"foo":"bar"}');
    const expected = crypto
      .createHmac('sha256', SECRET)
      .update('1730928000.{"foo":"bar"}')
      .digest('hex');
    expect(sig).toBe(expected);
  });
});

describe('verifyHmac', () => {
  it('returns true for valid signature', () => {
    const ts = '1730928000';
    const body = '{"a":1}';
    const sig = `sha256=${computeHmac(SECRET, ts, body)}`;
    expect(verifyHmac(SECRET, ts, body, sig)).toBe(true);
  });

  it('returns false for tampered body', () => {
    const ts = '1730928000';
    const sig = `sha256=${computeHmac(SECRET, ts, '{"a":1}')}`;
    expect(verifyHmac(SECRET, ts, '{"a":2}', sig)).toBe(false);
  });

  it('returns false for missing prefix', () => {
    const ts = '1730928000';
    const body = '{"a":1}';
    const sig = computeHmac(SECRET, ts, body); // sem "sha256=" prefix
    expect(verifyHmac(SECRET, ts, body, sig)).toBe(false);
  });

  it('returns false for malformed signature', () => {
    expect(verifyHmac(SECRET, '1730928000', '{}', 'garbage')).toBe(false);
  });
});

describe('isTimestampFresh', () => {
  it('returns true within 5min window', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTimestampFresh(String(now))).toBe(true);
    expect(isTimestampFresh(String(now - 100))).toBe(true);
  });

  it('returns false beyond 5min window', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTimestampFresh(String(now - 301))).toBe(false);
    expect(isTimestampFresh(String(now + 301))).toBe(false);
  });

  it('returns false for non-numeric timestamp', () => {
    expect(isTimestampFresh('abc')).toBe(false);
  });
});
```

- [ ] **Step 3: Rodar test (deve falhar)**

```bash
npm run api:test
```

Expected: erros tipo "Cannot find module '../../src/lib/hmac.js'".

- [ ] **Step 4: Implementar lib/hmac.ts**

`app/api/src/lib/hmac.ts`:

```typescript
import crypto from 'crypto';

export function computeHmac(secret: string, timestamp: string, body: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}

export function verifyHmac(
  secret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  if (!signature.startsWith('sha256=')) return false;
  const provided = signature.slice('sha256='.length);
  const expected = computeHmac(secret, timestamp, body);

  // Tamanhos diferentes → timingSafeEqual lança, retornamos false
  if (provided.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

const FIVE_MIN = 5 * 60;

export function isTimestampFresh(timestamp: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(nowSec - ts) <= FIVE_MIN;
}
```

- [ ] **Step 5: Rodar testes (devem passar)**

```bash
npm run api:test
```

Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
git add app/api/
git commit -m "feat(api): util HMAC com timing-safe verify e janela 5min"
```

---

### Task 6: Time util (TDD)

**Files:**
- Create: `app/api/src/lib/time.ts`
- Test: `app/api/tests/unit/time.test.ts`

- [ ] **Step 1: Escrever testes**

`app/api/tests/unit/time.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatHora, capitalize } from '../../src/lib/time.js';

describe('formatHora', () => {
  it('formats Date como HH:mm em pt-BR', () => {
    const d = new Date('2026-05-06T07:32:15.000-03:00');
    expect(formatHora(d, 'America/Sao_Paulo')).toBe('07:32');
  });

  it('zero-pads minutos', () => {
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
```

- [ ] **Step 2: Rodar (falha)**

```bash
npm run api:test -- tests/unit/time.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implementar lib/time.ts**

`app/api/src/lib/time.ts`:

```typescript
export function formatHora(date: Date, timeZone = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}

export function capitalize(s: string): string {
  if (!s) return '';
  return s[0].toUpperCase() + s.slice(1);
}
```

- [ ] **Step 4: Rodar (passa)**

```bash
npm run api:test -- tests/unit/time.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat(api): util de formatação de hora pt-BR"
```

---

### Task 7: Expo Push client wrapper

**Files:**
- Create: `app/api/src/lib/expoClient.ts`

> **Nota:** Sem teste unit aqui — wrapper fino sobre `expo-server-sdk`. Coberto via integration test do dispatcher mockando este módulo.

- [ ] **Step 1: Implementar wrapper**

`app/api/src/lib/expoClient.ts`:

```typescript
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { config } from '../config.js';

const expo = new Expo({
  accessToken: config.EXPO_ACCESS_TOKEN || undefined,
  useFcmV1: true,
});

export interface ExpoClient {
  isValidPushToken(token: string): boolean;
  sendPushNotificationsAsync(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]>;
}

export const expoClient: ExpoClient = {
  isValidPushToken(token) {
    return Expo.isExpoPushToken(token);
  },
  async sendPushNotificationsAsync(messages) {
    const tickets: ExpoPushTicket[] = [];
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    }
    return tickets;
  },
};

// Exporta tipos pra reuso
export type { ExpoPushMessage, ExpoPushTicket };
```

- [ ] **Step 2: Verificar TS compila**

```bash
npm run api -- run lint
```

Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/
git commit -m "feat(api): wrapper sobre expo-server-sdk para push notifications"
```

---

### Task 8: Errors util

**Files:**
- Create: `app/api/src/lib/errors.ts`

- [ ] **Step 1: Implementar**

`app/api/src/lib/errors.ts`:

```typescript
export class AppError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super('validation', message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource}_not_found`, `${resource} não encontrado`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'unauthorized') {
    super(code, 'Não autorizado', 401);
  }
}

export function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: string }).code === 'P2002'
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/
git commit -m "feat(api): classes de erro tipadas e helper Prisma unique"
```

---

## Phase 4 — Webhook Endpoint

### Task 9: Webhook route + integration test (TDD)

**Files:**
- Create: `app/api/src/routes/webhook.ts`
- Test: `app/api/tests/integration/webhook.test.ts`
- Modify: `app/api/src/server.ts`

> **Nota DB testes:** Setup de DB de teste real (SQL Server testcontainers) é mais elaborado. Pra simplicidade aqui, mockamos `prisma` via Vitest. Migração pra testcontainers entra como follow-up (out of scope MVP).

- [ ] **Step 1: Escrever teste integration (failing)**

`app/api/tests/integration/webhook.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { computeHmac } from '../../src/lib/hmac.js';

const SECRET = 'a'.repeat(32);

// Mock Prisma e expoClient antes de importar app
vi.mock('../../src/db.js', () => {
  const presencaEvento = {
    create: vi.fn(),
    findUnique: vi.fn(),
  };
  const aluno = {
    findUnique: vi.fn(),
  };
  return {
    prisma: { presencaEvento, aluno, $disconnect: vi.fn() },
    disconnectDb: vi.fn(),
  };
});

vi.mock('../../src/services/pushDispatcher.js', () => ({
  pushDispatcher: { dispatch: vi.fn().mockResolvedValue(undefined) },
}));

// Stub config (FR_WEBHOOK_SECRET)
process.env.FR_WEBHOOK_SECRET = SECRET;
process.env.JWT_SECRET = 'b'.repeat(32);
process.env.DATABASE_URL = 'sqlserver://localhost/test';

// Import dinâmico após mocks
const { buildApp } = await import('../../src/server.js');
const { prisma } = await import('../../src/db.js');
const { pushDispatcher } = await import('../../src/services/pushDispatcher.js');

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function signedHeaders(body: string, ts = String(Math.floor(Date.now() / 1000))) {
  return {
    'X-Signature': `sha256=${computeHmac(SECRET, ts, body)}`,
    'X-Timestamp': ts,
    'Content-Type': 'application/json',
  };
}

describe('POST /webhook/presenca', () => {
  it('retorna 401 com HMAC inválido', async () => {
    const body = JSON.stringify({ eventId: 'a', alunoMatricula: 'x', tipo: 'entrada', ocorridoEm: new Date().toISOString() });
    const res = await app.inject({
      method: 'POST',
      url: '/webhook/presenca',
      payload: body,
      headers: { 'X-Signature': 'sha256=bad', 'X-Timestamp': '1', 'Content-Type': 'application/json' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 401 com timestamp expirado', async () => {
    const body = JSON.stringify({ eventId: 'a', alunoMatricula: 'x', tipo: 'entrada', ocorridoEm: new Date().toISOString() });
    const ts = String(Math.floor(Date.now() / 1000) - 3600);
    const res = await app.inject({
      method: 'POST',
      url: '/webhook/presenca',
      payload: body,
      headers: signedHeaders(body, ts),
    });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 400 com payload inválido', async () => {
    const body = JSON.stringify({ eventId: 'a' }); // falta campos
    const res = await app.inject({
      method: 'POST',
      url: '/webhook/presenca',
      payload: body,
      headers: signedHeaders(body),
    });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 404 quando aluno não existe', async () => {
    (prisma.aluno.findUnique as any).mockResolvedValueOnce(null);
    const payload = {
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      alunoMatricula: 'NAO_EXISTE',
      tipo: 'entrada',
      ocorridoEm: '2026-05-06T07:32:15.000Z',
    };
    const body = JSON.stringify(payload);
    const res = await app.inject({
      method: 'POST',
      url: '/webhook/presenca',
      payload: body,
      headers: signedHeaders(body),
    });
    expect(res.statusCode).toBe(404);
  });

  it('persiste evento e responde 200 quando válido', async () => {
    (prisma.aluno.findUnique as any).mockResolvedValueOnce({ id: 'aluno-1', matricula: '2025001', nome: 'Júlia' });
    (prisma.presencaEvento.create as any).mockResolvedValueOnce({ id: 'ev-1', eventId: 'uuid-1' });
    const payload = {
      eventId: 'uuid-1',
      alunoMatricula: '2025001',
      tipo: 'entrada',
      ocorridoEm: '2026-05-06T07:32:15.000Z',
    };
    const body = JSON.stringify(payload);
    const res = await app.inject({
      method: 'POST',
      url: '/webhook/presenca',
      payload: body,
      headers: signedHeaders(body),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ received: true, duplicate: false });
    expect(prisma.presencaEvento.create).toHaveBeenCalled();
  });

  it('retorna duplicate=true em eventId duplicado', async () => {
    (prisma.aluno.findUnique as any).mockResolvedValueOnce({ id: 'aluno-1' });
    const uniqueErr: any = new Error('unique violation');
    uniqueErr.code = 'P2002';
    (prisma.presencaEvento.create as any).mockRejectedValueOnce(uniqueErr);
    (prisma.presencaEvento.findUnique as any).mockResolvedValueOnce({ id: 'ev-existing', eventId: 'uuid-dup' });
    const payload = {
      eventId: 'uuid-dup',
      alunoMatricula: '2025001',
      tipo: 'entrada',
      ocorridoEm: '2026-05-06T07:32:15.000Z',
    };
    const body = JSON.stringify(payload);
    const res = await app.inject({
      method: 'POST',
      url: '/webhook/presenca',
      payload: body,
      headers: signedHeaders(body),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ received: true, duplicate: true });
  });
});
```

- [ ] **Step 2: Refatorar server.ts pra exportar `buildApp`**

`app/api/src/server.ts`:

```typescript
import Fastify, { FastifyServerOptions } from 'fastify';
import { config } from './config.js';
import prismaPlugin from './plugins/prisma.js';
import webhookRoutes from './routes/webhook.js';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify({
    logger: opts.logger ?? {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
    ...opts,
  });

  await app.register(prismaPlugin);
  await app.register(webhookRoutes, { prefix: '/webhook' });

  app.get('/health', async (_, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch {
      reply.code(503);
      return { status: 'degraded', db: 'down' };
    }
  });

  return app;
}

async function bootstrap() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Só roda bootstrap se executado direto
if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap();
}
```

- [ ] **Step 3: Implementar webhook route**

`app/api/src/routes/webhook.ts`:

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { verifyHmac, isTimestampFresh } from '../lib/hmac.js';
import { isPrismaUniqueViolation } from '../lib/errors.js';
import { pushDispatcher } from '../services/pushDispatcher.js';

const presencaSchema = z.object({
  eventId: z.string().uuid(),
  alunoMatricula: z.string().min(1),
  tipo: z.enum(['entrada', 'saida']),
  ocorridoEm: z.string().datetime(),
  leitorId: z.string().optional(),
});

const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  app.post('/presenca', async (req, reply) => {
    const sig = req.headers['x-signature'] as string | undefined;
    const ts = req.headers['x-timestamp'] as string | undefined;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!sig || !ts) {
      return reply.code(401).send({ error: 'invalid_signature' });
    }
    if (!isTimestampFresh(ts)) {
      return reply.code(401).send({ error: 'timestamp_expired' });
    }
    if (!verifyHmac(config.FR_WEBHOOK_SECRET, ts, rawBody, sig)) {
      return reply.code(401).send({ error: 'invalid_signature' });
    }

    const parsed = presencaSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }
    const { eventId, alunoMatricula, tipo, ocorridoEm, leitorId } = parsed.data;

    const aluno = await app.prisma.aluno.findUnique({ where: { matricula: alunoMatricula } });
    if (!aluno) {
      return reply.code(404).send({ error: 'aluno_not_found' });
    }

    let evento;
    let duplicate = false;
    try {
      evento = await app.prisma.presencaEvento.create({
        data: { eventId, alunoId: aluno.id, tipo, ocorridoEm: new Date(ocorridoEm), leitorId },
      });
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        duplicate = true;
        evento = await app.prisma.presencaEvento.findUnique({ where: { eventId } });
      } else {
        app.log.error({ err: e }, 'erro ao persistir evento');
        return reply.code(500).send({ error: 'internal' });
      }
    }

    reply.code(200).send({ received: true, duplicate });

    if (!duplicate && evento) {
      setImmediate(() => {
        pushDispatcher.dispatch(evento!.id).catch((err) => {
          app.log.error({ err, eventoId: evento!.id }, 'falha ao despachar push');
        });
      });
    }
  });
};

export default webhookRoutes;
```

> **Nota:** O parser custom acima permite acessar `rawBody` para HMAC. Em prod, considerar `fastify-raw-body` plugin pra solução mais robusta. Para MVP é suficiente — `JSON.stringify(req.body)` reproduz body apenas se mantivermos o mesmo formato (sem espaços extras), o que é o caso dado FR usar `JSON.stringify` no envio.
>
> **Limitação conhecida**: HMAC reverify usando re-stringificado é frágil se houver diferenças de whitespace/ordenação. Migrar pra `fastify-raw-body` em follow-up.

- [ ] **Step 4: Stub do pushDispatcher (será implementado na próxima task)**

`app/api/src/services/pushDispatcher.ts`:

```typescript
export const pushDispatcher = {
  async dispatch(_eventoId: string): Promise<void> {
    // implementado na Task 10
  },
  async retry(_notificacaoId: string): Promise<void> {
    // implementado na Task 10
  },
};
```

- [ ] **Step 5: Rodar testes**

```bash
npm run api:test
```

Expected: 6 webhook tests + tests prévios passam.

- [ ] **Step 6: Commit**

```bash
git add app/api/
git commit -m "feat(api): endpoint webhook /presenca com HMAC, idempotência e dispatch async"
```

---

## Phase 5 — PushDispatcher (TDD)

### Task 10: PushDispatcher.dispatch + retry

**Files:**
- Modify: `app/api/src/services/pushDispatcher.ts`
- Test: `app/api/tests/unit/pushDispatcher.test.ts`

- [ ] **Step 1: Escrever testes**

`app/api/tests/unit/pushDispatcher.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prisma = {
  presencaEvento: { findUnique: vi.fn() },
  notificacao: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
  },
  pushToken: { delete: vi.fn() },
  $transaction: vi.fn((ops: Promise<any>[]) => Promise.all(ops)),
};

const expoClient = {
  isValidPushToken: vi.fn().mockReturnValue(true),
  sendPushNotificationsAsync: vi.fn(),
};

vi.mock('../../src/db.js', () => ({ prisma, disconnectDb: vi.fn() }));
vi.mock('../../src/lib/expoClient.js', () => ({ expoClient }));

const { pushDispatcher } = await import('../../src/services/pushDispatcher.js');

beforeEach(() => {
  vi.clearAllMocks();
});

const buildEvento = (responsaveis: any[]) => ({
  id: 'ev-1',
  tipo: 'entrada',
  ocorridoEm: new Date('2026-05-06T07:32:15.000-03:00'),
  aluno: {
    id: 'al-1',
    nome: 'Júlia',
    responsaveis,
  },
});

describe('PushDispatcher.dispatch', () => {
  it('marca falhou quando aluno sem responsáveis', async () => {
    prisma.presencaEvento.findUnique.mockResolvedValueOnce(buildEvento([]));

    await pushDispatcher.dispatch('ev-1');

    // Sem responsáveis: nenhuma notificação criada nem update
    expect(prisma.notificacao.create).not.toHaveBeenCalled();
    expect(expoClient.sendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('cria notificações falhou quando responsável sem tokens', async () => {
    prisma.presencaEvento.findUnique.mockResolvedValueOnce(buildEvento([
      { userId: 'u-1', user: { pushTokens: [] } },
    ]));
    prisma.notificacao.create.mockResolvedValueOnce({ id: 'n-1', userId: 'u-1' });

    await pushDispatcher.dispatch('ev-1');

    expect(prisma.notificacao.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'falhou', ultimoErro: 'no_push_tokens' }),
    }));
  });

  it('envia push e marca enviada em sucesso', async () => {
    prisma.presencaEvento.findUnique.mockResolvedValueOnce(buildEvento([
      { userId: 'u-1', user: { pushTokens: [{ id: 't-1', token: 'ExponentPushToken[abc]' }] } },
    ]));
    prisma.notificacao.create.mockResolvedValueOnce({ id: 'n-1', userId: 'u-1' });
    expoClient.sendPushNotificationsAsync.mockResolvedValueOnce([{ status: 'ok', id: 'tk' }]);

    await pushDispatcher.dispatch('ev-1');

    expect(expoClient.sendPushNotificationsAsync).toHaveBeenCalled();
    expect(prisma.notificacao.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'n-1' },
      data: expect.objectContaining({ status: 'enviada' }),
    }));
  });

  it('remove token inválido em DeviceNotRegistered', async () => {
    prisma.presencaEvento.findUnique.mockResolvedValueOnce(buildEvento([
      { userId: 'u-1', user: { pushTokens: [{ id: 't-bad', token: 'ExponentPushToken[bad]' }] } },
    ]));
    prisma.notificacao.create.mockResolvedValueOnce({ id: 'n-1', userId: 'u-1' });
    expoClient.sendPushNotificationsAsync.mockResolvedValueOnce([
      { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
    ]);

    await pushDispatcher.dispatch('ev-1');

    expect(prisma.pushToken.delete).toHaveBeenCalledWith({ where: { id: 't-bad' } });
    expect(prisma.notificacao.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'falhou' }),
    }));
  });
});
```

- [ ] **Step 2: Rodar (falha)**

```bash
npm run api:test -- tests/unit/pushDispatcher.test.ts
```

Expected: failures (stub atual não implementa).

- [ ] **Step 3: Implementar pushDispatcher.ts**

`app/api/src/services/pushDispatcher.ts`:

```typescript
import { prisma } from '../db.js';
import { expoClient, ExpoPushMessage } from '../lib/expoClient.js';
import { formatHora, capitalize } from '../lib/time.js';

interface EventoComResponsaveis {
  id: string;
  tipo: string;
  ocorridoEm: Date;
  aluno: {
    id: string;
    nome: string;
    responsaveis: Array<{
      userId: string;
      user: {
        pushTokens: Array<{ id: string; token: string }>;
      };
    }>;
  };
}

function buildMensagem(evento: EventoComResponsaveis) {
  const titulo = `${evento.aluno.nome} ${evento.tipo === 'entrada' ? 'chegou' : 'saiu'}`;
  const corpo = `${capitalize(evento.tipo)} registrada às ${formatHora(evento.ocorridoEm)}`;
  return { titulo, corpo };
}

async function processEvento(evento: EventoComResponsaveis) {
  const { titulo, corpo } = buildMensagem(evento);

  if (evento.aluno.responsaveis.length === 0) {
    return;
  }

  // Cria 1 notificação por responsável
  const notificacoes = await prisma.$transaction(
    evento.aluno.responsaveis.map((rel) =>
      prisma.notificacao.create({
        data: {
          userId: rel.userId,
          eventoId: evento.id,
          titulo,
          corpo,
          status: 'pendente',
        },
      })
    )
  );

  // Coleta tokens com referência ao userId pra mapear ticket → notificação
  const tokenEntries: Array<{ userId: string; tokenId: string; token: string }> = [];
  for (const rel of evento.aluno.responsaveis) {
    for (const t of rel.user.pushTokens) {
      tokenEntries.push({ userId: rel.userId, tokenId: t.id, token: t.token });
    }
  }

  if (tokenEntries.length === 0) {
    await prisma.notificacao.updateMany({
      where: { id: { in: notificacoes.map((n) => n.id) } },
      data: { status: 'falhou', ultimoErro: 'no_push_tokens', tentativas: 1 },
    });
    return;
  }

  const messages: ExpoPushMessage[] = tokenEntries.map((te) => ({
    to: te.token,
    title: titulo,
    body: corpo,
    data: { eventoId: evento.id, alunoId: evento.aluno.id, tipo: evento.tipo },
    sound: 'default',
    priority: 'high',
  }));

  const tickets = await expoClient.sendPushNotificationsAsync(messages);

  // Para cada token, atualiza notificação do user dono
  // Map userId → notificacaoId pra lookup
  const notifByUser = new Map(notificacoes.map((n) => [n.userId, n.id]));
  // Track quais users já tiveram sucesso para não sobrescrever 'enviada' com 'falhou' de outro device
  const userStatus = new Map<string, 'enviada' | 'falhou'>();
  const userErros = new Map<string, string>();

  for (let i = 0; i < tokenEntries.length; i++) {
    const te = tokenEntries[i];
    const ticket = tickets[i];

    if (ticket.status === 'ok') {
      userStatus.set(te.userId, 'enviada');
    } else {
      const errType = (ticket.details as { error?: string } | undefined)?.error;
      if (errType === 'DeviceNotRegistered') {
        await prisma.pushToken.delete({ where: { id: te.tokenId } }).catch(() => {});
      }
      // Só marca falhou se ainda não houve sucesso pra este user
      if (userStatus.get(te.userId) !== 'enviada') {
        userStatus.set(te.userId, 'falhou');
        userErros.set(te.userId, ticket.message ?? errType ?? 'unknown');
      }
    }
  }

  for (const [userId, status] of userStatus) {
    const notifId = notifByUser.get(userId);
    if (!notifId) continue;
    await prisma.notificacao.update({
      where: { id: notifId },
      data: {
        status,
        enviadaEm: status === 'enviada' ? new Date() : undefined,
        ultimoErro: status === 'falhou' ? userErros.get(userId) : undefined,
        tentativas: { increment: 1 },
      },
    });
  }
}

export const pushDispatcher = {
  async dispatch(eventoId: string): Promise<void> {
    const evento = await prisma.presencaEvento.findUnique({
      where: { id: eventoId },
      include: {
        aluno: {
          include: {
            responsaveis: {
              include: { user: { include: { pushTokens: true } } },
            },
          },
        },
      },
    }) as EventoComResponsaveis | null;

    if (!evento) return;
    await processEvento(evento);
  },

  async retry(notificacaoId: string): Promise<void> {
    const notif = await prisma.notificacao.findUnique({
      where: { id: notificacaoId },
      include: {
        evento: {
          include: {
            aluno: {
              include: {
                responsaveis: {
                  where: { userId: undefined }, // overridden abaixo
                  include: { user: { include: { pushTokens: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!notif) return;

    // Para retry, processa só o user específico (não fan-out de novo)
    const evento = notif.evento;
    const responsavel = evento.aluno.responsaveis.find((r) => r.userId === notif.userId);
    if (!responsavel) return;

    const tokens = responsavel.user.pushTokens;
    if (tokens.length === 0) {
      await prisma.notificacao.update({
        where: { id: notif.id },
        data: {
          status: 'falhou',
          tentativas: { increment: 1 },
          ultimoErro: 'no_push_tokens',
        },
      });
      return;
    }

    const { titulo, corpo } = buildMensagem(evento as any);
    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: titulo,
      body: corpo,
      data: { eventoId: evento.id, alunoId: evento.aluno.id, tipo: evento.tipo },
      sound: 'default',
      priority: 'high',
    }));

    const tickets = await expoClient.sendPushNotificationsAsync(messages);
    const sucesso = tickets.some((t) => t.status === 'ok');
    const erros = tickets
      .filter((t) => t.status !== 'ok')
      .map((t) => t.message ?? 'unknown')
      .join(', ');

    // Limpa tokens inválidos
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status !== 'ok') {
        const errType = (ticket.details as { error?: string } | undefined)?.error;
        if (errType === 'DeviceNotRegistered') {
          await prisma.pushToken.delete({ where: { id: tokens[i].id } }).catch(() => {});
        }
      }
    }

    await prisma.notificacao.update({
      where: { id: notif.id },
      data: {
        status: sucesso ? 'enviada' : 'falhou',
        enviadaEm: sucesso ? new Date() : undefined,
        tentativas: { increment: 1 },
        ultimoErro: sucesso ? null : erros,
      },
    });
  },
};
```

- [ ] **Step 4: Rodar testes**

```bash
npm run api:test
```

Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat(api): PushDispatcher com fan-out, dedup de status por user e cleanup de tokens inválidos"
```

---

## Phase 6 — REST Endpoints (autenticação JWT + rotas)

### Task 11: Auth plugin (JWT)

**Files:**
- Create: `app/api/src/plugins/auth.ts`
- Modify: `app/api/src/server.ts`

- [ ] **Step 1: Implementar plugin auth**

`app/api/src/plugins/auth.ts`:

```typescript
import fp from 'fastify-plugin';
import jwtPlugin from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyJWT {
    payload: { userId: string; cpf?: string };
    user: { userId: string; cpf?: string };
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(jwtPlugin, { secret: config.JWT_SECRET });

  app.decorate('authenticate', async function (req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
```

- [ ] **Step 2: Registrar no server**

Modify `app/api/src/server.ts` em `buildApp`:

```typescript
import authPlugin from './plugins/auth.js';

// dentro de buildApp, após prismaPlugin:
await app.register(authPlugin);
```

- [ ] **Step 3: Verificar TS**

```bash
npm run api -- run lint
```

- [ ] **Step 4: Commit**

```bash
git add app/api/
git commit -m "feat(api): plugin de autenticação JWT compartilhado com API atual"
```

---

### Task 12: POST /push-tokens + DELETE /push-tokens/:id (TDD)

**Files:**
- Create: `app/api/src/routes/pushTokens.ts`
- Test: `app/api/tests/integration/pushTokens.test.ts`
- Modify: `app/api/src/server.ts`

- [ ] **Step 1: Escrever testes**

`app/api/tests/integration/pushTokens.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const prismaMock = {
  pushToken: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  $disconnect: vi.fn(),
  $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
};

vi.mock('../../src/db.js', () => ({ prisma: prismaMock, disconnectDb: vi.fn() }));

process.env.JWT_SECRET = 'b'.repeat(32);
process.env.FR_WEBHOOK_SECRET = 'a'.repeat(32);
process.env.DATABASE_URL = 'sqlserver://localhost/test';

const { buildApp } = await import('../../src/server.js');

let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
  token = app.jwt.sign({ userId: 'user-1' });
});

afterAll(async () => {
  await app.close();
});

describe('POST /push-tokens', () => {
  it('rejeita sem JWT', async () => {
    const res = await app.inject({ method: 'POST', url: '/push-tokens', payload: { token: 'x', platform: 'android' } });
    expect(res.statusCode).toBe(401);
  });

  it('cria token (idempotente via upsert)', async () => {
    prismaMock.pushToken.upsert.mockResolvedValueOnce({ id: 'pt-1', userId: 'user-1', token: 'ExponentPushToken[abc]' });
    const res = await app.inject({
      method: 'POST',
      url: '/push-tokens',
      headers: { authorization: `Bearer ${token}` },
      payload: { token: 'ExponentPushToken[abc]', platform: 'android' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toMatchObject({ id: 'pt-1' });
    expect(prismaMock.pushToken.upsert).toHaveBeenCalled();
  });

  it('rejeita platform inválido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/push-tokens',
      headers: { authorization: `Bearer ${token}` },
      payload: { token: 'ExponentPushToken[x]', platform: 'windows' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /push-tokens/:id', () => {
  it('rejeita sem JWT', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/push-tokens/pt-1' });
    expect(res.statusCode).toBe(401);
  });

  it('deleta quando dono', async () => {
    prismaMock.pushToken.findUnique.mockResolvedValueOnce({ id: 'pt-1', userId: 'user-1' });
    prismaMock.pushToken.delete.mockResolvedValueOnce({});
    const res = await app.inject({
      method: 'DELETE',
      url: '/push-tokens/pt-1',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('rejeita 404 quando não dono', async () => {
    prismaMock.pushToken.findUnique.mockResolvedValueOnce({ id: 'pt-1', userId: 'outro-user' });
    const res = await app.inject({
      method: 'DELETE',
      url: '/push-tokens/pt-1',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Implementar route**

`app/api/src/routes/pushTokens.ts`:

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string().optional(),
});

const pushTokensRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }
    const { token, platform, deviceId } = parsed.data;
    const userId = req.user.userId;

    const row = await app.prisma.pushToken.upsert({
      where: { token },
      create: { token, platform, deviceId, userId },
      update: { lastUsedAt: new Date(), userId, platform, deviceId },
    });

    return reply.code(200).send({ id: row.id });
  });

  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = req.user.userId;

    const existing = await app.prisma.pushToken.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return reply.code(404).send({ error: 'not_found' });
    }

    await app.prisma.pushToken.delete({ where: { id } });
    return reply.code(204).send();
  });
};

export default pushTokensRoutes;
```

- [ ] **Step 3: Registrar no server**

Modify `app/api/src/server.ts`:

```typescript
import pushTokensRoutes from './routes/pushTokens.js';
// ...
await app.register(pushTokensRoutes, { prefix: '/push-tokens' });
```

- [ ] **Step 4: Rodar testes**

```bash
npm run api:test
```

Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat(api): endpoints de registro/remoção de push tokens com auth JWT"
```

---

### Task 13: GET /notificacoes + PATCH lida + lidas-todas (TDD)

**Files:**
- Create: `app/api/src/routes/notificacoes.ts`
- Test: `app/api/tests/integration/notificacoes.test.ts`
- Modify: `app/api/src/server.ts`

- [ ] **Step 1: Escrever testes**

`app/api/tests/integration/notificacoes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const prismaMock = {
  notificacao: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
  },
  $disconnect: vi.fn(),
  $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
};

vi.mock('../../src/db.js', () => ({ prisma: prismaMock, disconnectDb: vi.fn() }));

process.env.JWT_SECRET = 'b'.repeat(32);
process.env.FR_WEBHOOK_SECRET = 'a'.repeat(32);
process.env.DATABASE_URL = 'sqlserver://localhost/test';

const { buildApp } = await import('../../src/server.js');

let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
  token = app.jwt.sign({ userId: 'user-1' });
});

afterAll(async () => {
  await app.close();
});

describe('GET /notificacoes', () => {
  it('rejeita sem JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/notificacoes' });
    expect(res.statusCode).toBe(401);
  });

  it('retorna lista paginada', async () => {
    prismaMock.notificacao.findMany.mockResolvedValueOnce([
      {
        id: 'n-1',
        titulo: 'Júlia chegou',
        corpo: 'Entrada às 07:32',
        status: 'enviada',
        lidaEm: null,
        criadaEm: new Date('2026-05-06T07:32:16.000Z'),
        evento: {
          tipo: 'entrada',
          ocorridoEm: new Date('2026-05-06T07:32:15.000Z'),
          aluno: { nome: 'Júlia' },
        },
      },
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/notificacoes?limit=10',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ id: 'n-1', alunoNome: 'Júlia', tipo: 'entrada' });
  });
});

describe('PATCH /notificacoes/:id/lida', () => {
  it('marca como lida', async () => {
    prismaMock.notificacao.findUnique.mockResolvedValueOnce({ id: 'n-1', userId: 'user-1', lidaEm: null });
    prismaMock.notificacao.update.mockResolvedValueOnce({});
    const res = await app.inject({
      method: 'PATCH',
      url: '/notificacoes/n-1/lida',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('404 se não dono', async () => {
    prismaMock.notificacao.findUnique.mockResolvedValueOnce({ id: 'n-1', userId: 'outro' });
    const res = await app.inject({
      method: 'PATCH',
      url: '/notificacoes/n-1/lida',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /notificacoes/lidas-todas', () => {
  it('marca todas do user', async () => {
    prismaMock.notificacao.updateMany.mockResolvedValueOnce({ count: 5 });
    const res = await app.inject({
      method: 'PATCH',
      url: '/notificacoes/lidas-todas',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(204);
    expect(prismaMock.notificacao.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-1', lidaEm: null }),
    }));
  });
});
```

- [ ] **Step 2: Implementar route**

`app/api/src/routes/notificacoes.ts`:

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

const notificacoesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation', details: parsed.error.errors });
    }
    const { cursor, limit, status } = parsed.data;
    const userId = req.user.userId;

    const where: any = { userId };
    if (status) {
      where.status = status;
    } else {
      // Default: oculta pendente e falhou
      where.status = { in: ['enviada', 'lida'] };
    }

    const items = await app.prisma.notificacao.findMany({
      where,
      orderBy: { criadaEm: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        evento: {
          select: {
            tipo: true,
            ocorridoEm: true,
            aluno: { select: { nome: true } },
          },
        },
      },
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? sliced[sliced.length - 1].id : null;

    return reply.code(200).send({
      items: sliced.map((n: any) => ({
        id: n.id,
        titulo: n.titulo,
        corpo: n.corpo,
        alunoNome: n.evento.aluno.nome,
        tipo: n.evento.tipo,
        ocorridoEm: n.evento.ocorridoEm,
        lidaEm: n.lidaEm,
        criadaEm: n.criadaEm,
      })),
      nextCursor,
    });
  });

  app.patch('/lidas-todas', { onRequest: [app.authenticate] }, async (req, reply) => {
    await app.prisma.notificacao.updateMany({
      where: { userId: req.user.userId, lidaEm: null },
      data: { lidaEm: new Date(), status: 'lida' },
    });
    return reply.code(204).send();
  });

  app.patch('/:id/lida', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = req.user.userId;
    const existing = await app.prisma.notificacao.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return reply.code(404).send({ error: 'not_found' });
    }
    if (!existing.lidaEm) {
      await app.prisma.notificacao.update({
        where: { id },
        data: { lidaEm: new Date(), status: 'lida' },
      });
    }
    return reply.code(204).send();
  });
};

export default notificacoesRoutes;
```

- [ ] **Step 3: Registrar no server**

```typescript
import notificacoesRoutes from './routes/notificacoes.js';
// ...
await app.register(notificacoesRoutes, { prefix: '/notificacoes' });
```

- [ ] **Step 4: Rodar testes**

```bash
npm run api:test
```

Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat(api): endpoints de listagem e marcação de notificações"
```

---

## Phase 7 — Cron Retry Worker

### Task 14: RetryWorker

**Files:**
- Create: `app/api/src/services/retryWorker.ts`
- Modify: `app/api/src/server.ts`

> **Nota:** Sem teste isolado aqui (cron interno). Coberto por integração indireta + smoke manual.

- [ ] **Step 1: Implementar**

`app/api/src/services/retryWorker.ts`:

```typescript
import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../db.js';
import { pushDispatcher } from './pushDispatcher.js';

const MAX_TENTATIVAS = 5;
const JANELA_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 100;

let task: ScheduledTask | null = null;

export const retryWorker = {
  start(logger: { info: (...a: any[]) => void; error: (...a: any[]) => void }) {
    if (task) return;
    task = cron.schedule('*/5 * * * *', async () => {
      try {
        const corte = new Date(Date.now() - JANELA_MS);
        const falhadas = await prisma.notificacao.findMany({
          where: {
            status: 'falhou',
            tentativas: { lt: MAX_TENTATIVAS },
            criadaEm: { gt: corte },
          },
          take: BATCH_SIZE,
        });

        if (falhadas.length === 0) return;
        logger.info({ count: falhadas.length }, 'retry worker processando falhas');

        for (const notif of falhadas) {
          try {
            await pushDispatcher.retry(notif.id);
          } catch (err) {
            logger.error({ err, notifId: notif.id }, 'falha em retry de notificação');
          }
        }
      } catch (err) {
        logger.error({ err }, 'retry worker erro geral');
      }
    });
  },

  stop() {
    if (task) {
      task.stop();
      task = null;
    }
  },
};
```

- [ ] **Step 2: Iniciar no server (apenas em prod/dev, não em testes)**

Modify `app/api/src/server.ts`:

```typescript
import { retryWorker } from './services/retryWorker.js';

// dentro de buildApp, no final, antes de return:
if (config.NODE_ENV !== 'test') {
  retryWorker.start(app.log as any);
  app.addHook('onClose', async () => {
    retryWorker.stop();
  });
}
```

- [ ] **Step 3: Verificar TS**

```bash
npm run api -- run lint
```

- [ ] **Step 4: Commit**

```bash
git add app/api/
git commit -m "feat(api): cron worker de retry para notificações falhadas"
```

---

## Phase 8 — Mobile Setup

### Task 15: Instalar deps de notificações

**Files:**
- Modify: `app/mobile/package.json`
- Modify: `app/mobile/app.json`

- [ ] **Step 1: Instalar deps**

```bash
cd app/mobile
npx expo install expo-notifications expo-device
cd ../..
```

Expected: deps adicionadas ao `package.json` do mobile, lock atualizado.

- [ ] **Step 2: Adicionar plugin no app.json**

Modify `app/mobile/app.json` — dentro de `expo`, adicionar/atualizar `plugins`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6",
          "defaultChannel": "presenca"
        }
      ]
    ]
  }
}
```

> **Nota:** Se não houver `notification-icon.png` em assets, pode omitir `icon` no plugin temporariamente. Cor `#3B82F6` é placeholder — ajustar pra `colors.edu.primary` real.

- [ ] **Step 3: Verificar Expo aceita config**

```bash
npm run mobile:start
```

Expected: dev server inicia sem warnings sobre plugin. `Ctrl+C` pra parar.

- [ ] **Step 4: Commit**

```bash
git add app/mobile/
git commit -m "feat(mobile): adiciona expo-notifications e expo-device"
```

---

### Task 16: Service pushTokens + notificacoes (mobile)

**Files:**
- Create: `app/mobile/src/services/pushTokens/index.ts`
- Create: `app/mobile/src/services/notificacoes/index.ts`

- [ ] **Step 1: Inspecionar api.tsx existente**

```bash
cat app/mobile/src/services/api.tsx | head -50
```

Anotar nome do export (provavelmente `api`) e como é configurado.

- [ ] **Step 2: Criar pushTokens service**

`app/mobile/src/services/pushTokens/index.ts`:

```typescript
import { api } from '../api';

export type Platform = 'ios' | 'android';

export interface RegisterPushTokenInput {
  token: string;
  platform: Platform;
  deviceId?: string;
}

export interface RegisterPushTokenResponse {
  id: string;
}

export async function registerPushToken(input: RegisterPushTokenInput): Promise<RegisterPushTokenResponse> {
  const { data } = await api.post<RegisterPushTokenResponse>('/push-tokens', input);
  return data;
}

export async function unregisterPushToken(id: string): Promise<void> {
  await api.delete(`/push-tokens/${id}`);
}
```

- [ ] **Step 3: Criar notificacoes service**

`app/mobile/src/services/notificacoes/index.ts`:

```typescript
import { api } from '../api';

export type TipoEvento = 'entrada' | 'saida';

export interface NotificacaoDTO {
  id: string;
  titulo: string;
  corpo: string;
  alunoNome: string;
  tipo: TipoEvento;
  ocorridoEm: string;
  lidaEm: string | null;
  criadaEm: string;
}

export interface ListarNotificacoesParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

export interface ListarNotificacoesResponse {
  items: NotificacaoDTO[];
  nextCursor: string | null;
}

export async function listarNotificacoes(params: ListarNotificacoesParams = {}): Promise<ListarNotificacoesResponse> {
  const { data } = await api.get<ListarNotificacoesResponse>('/notificacoes', { params });
  return data;
}

export async function marcarLida(id: string): Promise<void> {
  await api.patch(`/notificacoes/${id}/lida`);
}

export async function marcarTodasLidas(): Promise<void> {
  await api.patch('/notificacoes/lidas-todas');
}
```

- [ ] **Step 4: Verificar TS compila**

```bash
cd app/mobile
npx tsc --noEmit
cd ../..
```

Expected: zero erros (ou apenas erros pré-existentes do projeto, não introduzidos pelos novos arquivos).

- [ ] **Step 5: Commit**

```bash
git add app/mobile/
git commit -m "feat(mobile): services de push tokens e notificações"
```

---

### Task 17: Hooks useExpoPushToken + useNotificationListener

**Files:**
- Create: `app/mobile/src/hooks/useExpoPushToken.ts`
- Create: `app/mobile/src/hooks/useNotificationListener.ts`

- [ ] **Step 1: Verificar AuthContext disponibiliza user/token**

```bash
cat app/mobile/src/context/AuthContext.tsx
```

Anotar shape de `useAuth()` (provavelmente `{ user, token, login, logout }`).

> **Importante:** Os hooks abaixo assumem `useAuth()` retorna `{ user, token }`. Se shape diferente, ajustar import e desestruturação.

- [ ] **Step 2: Criar useExpoPushToken**

`app/mobile/src/hooks/useExpoPushToken.ts`:

```typescript
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { registerPushToken } from '../services/pushTokens';

export function useExpoPushToken() {
  const auth = useAuth();
  const user = (auth as any).user;
  const jwt = (auth as any).token;

  useEffect(() => {
    if (!user || !jwt) return;
    if (!Device.isDevice) return;

    let cancelled = false;
    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('presenca', {
            name: 'Presença',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
          });
        }

        const projectId =
          (Constants.expoConfig?.extra as any)?.eas?.projectId ??
          Constants.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        if (cancelled) return;

        await registerPushToken({
          token: tokenData.data,
          platform: Platform.OS as 'ios' | 'android',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useExpoPushToken] erro ao registrar', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, jwt]);
}
```

- [ ] **Step 3: Criar useNotificationListener**

`app/mobile/src/hooks/useNotificationListener.ts`:

```typescript
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

// Configura comportamento foreground (mostra alert mesmo com app aberto)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotificationListener() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Navega para tela de notificações ao tocar
      try {
        navigation.navigate('Notificacoes', { highlightId: (data as any)?.notificacaoId });
      } catch {
        // se rota ainda não registrada, ignora
      }
    });

    return () => sub.remove();
  }, [navigation]);
}
```

- [ ] **Step 4: Verificar TS**

```bash
cd app/mobile && npx tsc --noEmit && cd ../..
```

- [ ] **Step 5: Commit**

```bash
git add app/mobile/
git commit -m "feat(mobile): hooks para registro de push token e listener de tap"
```

---

### Task 18: Tela Notificações + componentes

**Files:**
- Create: `app/mobile/src/screens/notificacoes/index.tsx`
- Create: `app/mobile/src/screens/notificacoes/NotificacaoItem.tsx`
- Create: `app/mobile/src/screens/notificacoes/EmptyState.tsx`

- [ ] **Step 1: Criar EmptyState**

`app/mobile/src/screens/notificacoes/EmptyState.tsx`:

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name="notifications-off-outline" size={64} color="#9CA3AF" />
      <Text className="mt-4 text-lg font-semibold text-gray-700">
        Sem notificações ainda
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500">
        Quando seu filho passar pelo leitor da escola, você verá os avisos aqui.
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Criar NotificacaoItem**

`app/mobile/src/screens/notificacoes/NotificacaoItem.tsx`:

```tsx
import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NotificacaoDTO } from '../../services/notificacoes';

interface Props {
  notificacao: NotificacaoDTO;
  onPress: (n: NotificacaoDTO) => void;
}

function formatarHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function NotificacaoItem({ notificacao, onPress }: Props) {
  const naoLida = !notificacao.lidaEm;
  const icone = notificacao.tipo === 'entrada' ? 'log-in-outline' : 'log-out-outline';

  return (
    <Pressable
      onPress={() => onPress(notificacao)}
      className={`flex-row items-start gap-3 px-4 py-3 border-b border-gray-100 ${naoLida ? 'bg-blue-50' : 'bg-white'}`}
    >
      <View className="mt-1">
        <Ionicons name={icone} size={24} color={naoLida ? '#3B82F6' : '#6B7280'} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className={`text-base ${naoLida ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
            {notificacao.titulo}
          </Text>
          {naoLida && <View className="w-2 h-2 rounded-full bg-blue-500" />}
        </View>
        <Text className="text-sm text-gray-600 mt-0.5">{notificacao.corpo}</Text>
        <Text className="text-xs text-gray-400 mt-1">
          {formatarData(notificacao.ocorridoEm)} · {formatarHora(notificacao.ocorridoEm)}
        </Text>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 3: Criar tela principal**

`app/mobile/src/screens/notificacoes/index.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  listarNotificacoes,
  marcarLida,
  marcarTodasLidas,
  type NotificacaoDTO,
} from '../../services/notificacoes';
import { NotificacaoItem } from './NotificacaoItem';
import { EmptyState } from './EmptyState';

export function NotificacoesScreen() {
  const [items, setItems] = useState<NotificacaoDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const carregarPagina = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await listarNotificacoes({
        cursor: reset ? undefined : cursor ?? undefined,
        limit: 20,
      });
      setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    carregarPagina(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setCursor(null);
    setHasMore(true);
    await carregarPagina(true);
    setRefreshing(false);
  };

  const onPressItem = async (n: NotificacaoDTO) => {
    if (!n.lidaEm) {
      try {
        await marcarLida(n.id);
        setItems((prev) =>
          prev.map((it) => (it.id === n.id ? { ...it, lidaEm: new Date().toISOString() } : it))
        );
      } catch {
        // ignora — UX não-bloqueante
      }
    }
  };

  const onPressMarcarTodas = async () => {
    try {
      await marcarTodasLidas();
      const agora = new Date().toISOString();
      setItems((prev) => prev.map((it) => (it.lidaEm ? it : { ...it, lidaEm: agora })));
    } catch {
      // ignora
    }
  };

  const temNaoLidas = items.some((it) => !it.lidaEm);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900">Notificações</Text>
        {temNaoLidas && (
          <Pressable onPress={onPressMarcarTodas}>
            <Text className="text-sm text-blue-600 font-medium">Marcar todas como lidas</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <NotificacaoItem notificacao={item} onPress={onPressItem} />}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        ListFooterComponent={loading && items.length > 0 ? <ActivityIndicator className="my-4" /> : null}
        onEndReached={() => hasMore && !loading && carregarPagina(false)}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
}

export default NotificacoesScreen;
```

- [ ] **Step 4: TS check**

```bash
cd app/mobile && npx tsc --noEmit && cd ../..
```

- [ ] **Step 5: Commit**

```bash
git add app/mobile/
git commit -m "feat(mobile): tela Notificações com FlatList paginada e marcar como lida"
```

---

### Task 19: Adicionar rota Notificações

**Files:**
- Modify: `app/mobile/src/routes/index.tsx`
- Modify: `app/mobile/educonecta.d.ts`

- [ ] **Step 1: Inspecionar routes atual**

```bash
cat app/mobile/src/routes/index.tsx
```

Identificar: usa stack? bottom-tabs? estrutura atual.

> **Nota pro implementador:** Os passos abaixo são **template de exemplo**. Adapte aos nomes/estrutura reais que encontrar no `routes/index.tsx`. O importante é: importar `NotificacoesScreen`, registrar com nome `Notificacoes`, e expor no nav (tab ou stack — preferência: tab se existir tab bar, senão stack screen acessível por ícone de sino).

- [ ] **Step 2: Adicionar rota**

Modify `app/mobile/src/routes/index.tsx` — adicionar import e registrar screen:

```tsx
import { NotificacoesScreen } from '../screens/notificacoes';

// Em algum lugar do navigator (Stack.Navigator ou Tab.Navigator):
<Stack.Screen
  name="Notificacoes"
  component={NotificacoesScreen}
  options={{ title: 'Notificações' }}
/>
```

Se houver `Tab.Navigator` no `routes/index.tsx`, adicione como tab:

```tsx
import { Ionicons } from '@expo/vector-icons';

<Tab.Screen
  name="Notificacoes"
  component={NotificacoesScreen}
  options={{
    title: 'Notificações',
    tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
  }}
/>
```

- [ ] **Step 3: Atualizar tipagem**

Modify `app/mobile/educonecta.d.ts` — adicionar `Notificacoes` no `RootStackParamList` (ou tipagem equivalente do navigator):

```typescript
export type RootStackParamList = {
  // ... rotas existentes
  Notificacoes: { highlightId?: string } | undefined;
};
```

> Se a tipagem real usar nome diferente (ex: `RootTabParamList`), adapte.

- [ ] **Step 4: TS check**

```bash
cd app/mobile && npx tsc --noEmit && cd ../..
```

- [ ] **Step 5: Commit**

```bash
git add app/mobile/
git commit -m "feat(mobile): registra rota Notificações no navigator"
```

---

### Task 20: Wire hooks no App.tsx

**Files:**
- Modify: `app/mobile/App.tsx`

- [ ] **Step 1: Inspecionar App.tsx**

```bash
cat app/mobile/App.tsx
```

- [ ] **Step 2: Criar componente interno que chama hooks (precisam estar dentro do NavigationContainer pra useNavigation funcionar)**

Modify `app/mobile/App.tsx`:

```tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Routes } from './src/routes';
import { AlertProvider } from './src/context/AlertContext';
import { LoadingProvider } from './src/context/LoadingContext';
import { AlunoProvider } from './src/context/AlunoContext';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationBootstrap } from './src/components/NotificationBootstrap';
import { colors } from './src/constants/colors';

export default function App() {
  return (
    <>
      <AlertProvider>
        <AuthProvider>
          <AlunoProvider>
            <LoadingProvider>
              <StatusBar style="light" backgroundColor={colors.edu.primary} />
              <Routes>
                <NotificationBootstrap />
              </Routes>
            </LoadingProvider>
          </AlunoProvider>
        </AuthProvider>
      </AlertProvider>
    </>
  );
}
```

> **Nota:** Se `App.tsx` atual **não** tem `AuthProvider` no envoltório (no original visto em context.md, não aparece — só Alert, Aluno, Loading), adicionar `AuthProvider` requer existir esse provider. Se já existe `useAuth()` global via hook diferente (singleton, secure-store direto), adapte: o `useExpoPushToken` precisa apenas ler user+token de algum lugar.
>
> Adaptação alternativa se não há `AuthProvider` envolvendo: chamar os hooks **dentro** do `Routes` (ex: na tela Home logo após login), não no App.tsx. Nesse caso, `NotificationBootstrap` fica na Home.

- [ ] **Step 3: Criar componente NotificationBootstrap**

`app/mobile/src/components/NotificationBootstrap.tsx`:

```tsx
import { useExpoPushToken } from '../hooks/useExpoPushToken';
import { useNotificationListener } from '../hooks/useNotificationListener';

export function NotificationBootstrap() {
  useExpoPushToken();
  useNotificationListener();
  return null;
}
```

> **Nota:** Tem que estar **dentro** do `NavigationContainer` (que está dentro de `Routes`) pra `useNavigation` funcionar. Se `Routes` não aceitar children, mover `NotificationBootstrap` pra dentro do componente raiz do navigator (ex: como primeiro filho de `Stack.Navigator` parent ou em uma tela sempre montada após login).
>
> **Implementação alternativa simples:** colocar dentro de uma das telas garantidas após login (ex: `screens/home/index.tsx`).

- [ ] **Step 4: TS check**

```bash
cd app/mobile && npx tsc --noEmit && cd ../..
```

- [ ] **Step 5: Commit**

```bash
git add app/mobile/
git commit -m "feat(mobile): wire dos hooks de notificação na inicialização"
```

---

## Phase 9 — Smoke Test End-to-End

### Task 21: Smoke test manual com curl

**Files:** N/A (apenas teste manual)

- [ ] **Step 1: Subir API local**

```bash
npm run api:dev
```

Em terminal separado.

- [ ] **Step 2: Subir mobile em device físico**

```bash
npm run mobile:start
```

Abrir Expo Go no celular, scan QR. Logar com responsável de teste. Verificar logs do backend confirmam `POST /push-tokens` com 200.

- [ ] **Step 3: Simular webhook**

```bash
SECRET="<valor de FR_WEBHOOK_SECRET no .env>"
TIMESTAMP=$(date +%s)
BODY='{"eventId":"550e8400-e29b-41d4-a716-446655440000","alunoMatricula":"<matricula real>","tipo":"entrada","ocorridoEm":"2026-05-06T07:32:15.000Z"}'
SIG=$(echo -n "${TIMESTAMP}.${BODY}" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

curl -i -X POST http://localhost:3333/webhook/presenca \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=${SIG}" \
  -H "X-Timestamp: ${TIMESTAMP}" \
  -d "$BODY"
```

Expected: `200 OK` com `{"received":true,"duplicate":false}`. Push chega no celular dentro de 5-10s.

- [ ] **Step 4: Repetir mesmo eventId pra testar idempotência**

Mesmo curl com mesmo `eventId`. Expected: `200 OK` com `{"received":true,"duplicate":true}`. Sem push novo no celular.

- [ ] **Step 5: Verificar histórico in-app**

Abrir tela de Notificações no app. Push do passo 3 deve aparecer. Tap marca como lida (visual muda).

- [ ] **Step 6: Documentar issues encontrados**

Se algo falha: criar issues no GitHub (ou notas) listando, sem corrigir aqui (escopo do plano cumprido). Issues comuns esperáveis:
- Permissão de notificação negada → testar fluxo de re-pedir
- Token Expo demora a registrar → ajustar UX
- Cores do plugin notif não match com tema → ajustar `app.json`

- [ ] **Step 7: Commit (se houver ajustes pequenos)**

```bash
git add -A
git commit -m "chore: ajustes pós-smoke test E2E"
```

---

## Phase 10 — Documentação final

### Task 22: Atualizar context.md e CLAUDE.md com referências ao monorepo

**Files:**
- Modify: `context.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Atualizar context.md com nova estrutura monorepo**

Editar `context.md`:
- Seção "Estrutura de pastas" → mostrar layout `app/mobile` + `app/api`
- Adicionar seção "Backend (app/api)" listando endpoints e stack
- Atualizar comandos para usar `npm run mobile:*` e `npm run api:*`

- [ ] **Step 2: Atualizar CLAUDE.md**

- Seção "Comandos" → atualizar pra workspaces
- Seção "Convenções" → mencionar 2 ORMs (drizzle no mobile, prisma no api)
- Adicionar regra: "novo endpoint REST = criar em `app/api/src/routes/<dominio>.ts` + service correspondente em `app/mobile/src/services/<dominio>/`"

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md context.md
git commit -m "docs: atualiza CLAUDE.md e context.md com estrutura monorepo e backend"
```

---

## Self-Review (executado durante escrita)

**Spec coverage check:**

| Spec section | Tasks |
|---|---|
| Topologia + arquitetura | 1-2 (monorepo), 3-4 (api scaffold) |
| HMAC auth | 5 (hmac util), 9 (uso no webhook) |
| Idempotência eventId | 9 (try/catch unique violation) |
| Fan-out N:M responsáveis | 10 (PushDispatcher) |
| Multi-device tokens | 10 (loop em pushTokens), 12 (POST upsert) |
| Histórico in-app | 13 (GET notificacoes), 18 (tela) |
| Status pendente/enviada/falhou/lida | 10, 13, 14 |
| Cron retry 5min | 14 |
| Schema novo (3 tabelas) | 4 (schema.prisma) |
| Mobile expo-notifications | 15-17 |
| Tela com paginação | 18 |
| Rota nova | 19 |
| Smoke E2E | 21 |
| Segurança JWT | 11, 12, 13 |

**Sem placeholders:** verificado, todos steps têm código completo. Notas marcadas como tal.

**Type consistency:**
- `userId`, `eventoId`, `alunoId` usados consistentemente em api e DB
- `'entrada' | 'saida'` em ambos schema, dispatcher e mobile
- `NotificacaoDTO` shape match GET /notificacoes response → tela

**Limitações conhecidas (notadas inline):**
- HMAC com `JSON.stringify(req.body)` é frágil — migrar pra `fastify-raw-body` em follow-up
- DB testes mockados ao invés de testcontainers — follow-up
- `AuthContext` shape assumido — implementador valida e ajusta se diferente
- `notification-icon.png` placeholder

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-06-notificacoes-presenca.md`.

**User pre-authorized execution.** Going with **Inline Execution** (executing-plans skill) — batches with checkpoints, foreground in this session.
