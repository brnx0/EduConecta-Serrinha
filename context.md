# context.md

Contexto técnico e arquitetural do **EduConecta** (monorepo).

> Para regras de trabalho, modo de comunicação e comandos, veja [CLAUDE.md](./CLAUDE.md).

---

## Visão geral

App mobile (Expo/React Native) para conectar alunos, responsáveis e escola. Exposto: boletim, frequência, horários, ocorrências, mural, calendário escolar, solicitações, autorizações e conteúdo didático. Backend novo (`app/api`) integra sistema de reconhecimento facial externo para entregar push notifications de presença.

## Estrutura monorepo

```
educonecta/
├── package.json              # npm workspaces ["app/*"]
├── docs/
│   └── superpowers/
│       ├── specs/            # design docs aprovados
│       └── plans/            # implementation plans
├── app/
│   ├── mobile/               # Expo React Native (app dos pais)
│   └── api/                  # Fastify backend (notificações)
├── CLAUDE.md
└── context.md
```

## app/mobile

### Stack

| Camada        | Tecnologia                                              |
|---------------|---------------------------------------------------------|
| Runtime       | Expo SDK 54, React Native 0.81, React 19                |
| Linguagem     | TypeScript 5.9 (strict)                                 |
| Navegação     | React Navigation 7 (native-stack + bottom-tabs)         |
| UI/Estilo     | NativeWind 2 + Tailwind 3 + clsx + tailwind-merge       |
| HTTP          | axios (2 clients separados — ver abaixo)                |
| DB local      | expo-sqlite + drizzle-orm 0.45 (drizzle-kit)            |
| Auth/Storage  | expo-secure-store, jwt-decode                           |
| Notificações  | expo-notifications + expo-device                        |
| Device APIs   | expo-location, expo-document-picker, expo-file-system, expo-font |

Manifesto: [app/mobile/package.json](./app/mobile/package.json).

### Entry point

[app/mobile/App.tsx](./app/mobile/App.tsx) monta provedores na ordem:

```
AlertProvider
  └─ AlunoProvider
       └─ LoadingProvider
            └─ Routes
                 └─ AuthProvider (dentro de Routes)
                      └─ NavigationContainer
                           ├─ NotificationBootstrap  (quando user logado)
                           └─ Stack.Navigator
```

`StatusBar` usa `colors.edu.primary` de [app/mobile/src/constants/colors.ts](./app/mobile/src/constants/colors.ts).

### Estrutura de pastas (mobile)

```
app/mobile/src/
├── components/        # UI compartilhada
│   └── NotificationBootstrap.tsx  # Headless — monta hooks de notificação
├── constants/         # colors, configs estáticas
├── context/           # Providers globais
│   ├── AlertContext.tsx
│   ├── AlunoContext.tsx
│   ├── AuthContext.tsx
│   └── LoadingContext.tsx
├── hooks/                          # Novo
│   ├── useExpoPushToken.ts
│   └── useNotificationListener.ts
├── navigation/        # AppTabs (bottom tabs após login)
├── routes/
│   └── index.tsx      # Stack principal + lógica auth
├── screens/           # Telas por domínio
│   ├── autorizacoes/
│   ├── boletim/
│   ├── calendarioEscolar/
│   ├── conteudo/
│   ├── frequencia/
│   ├── home/
│   ├── horarios/
│   ├── login/
│   ├── mural/
│   ├── notificacoes/               # Novo (tela de histórico de push)
│   ├── ocorrencia/
│   └── solicitacoes/
├── services/          # Chamadas HTTP por domínio
│   ├── api.tsx                     # Cliente axios LEGADO (API existente)
│   ├── apiNotifications.tsx        # Novo — cliente p/ app/api (Bearer)
│   ├── autorizacoes/
│   ├── boletim/
│   ├── calendarioEscolar/
│   ├── conteudo/
│   ├── diversos/
│   ├── frequencia/
│   ├── home/
│   ├── horario/
│   ├── login/
│   ├── mural/
│   ├── notificacoes/               # Novo
│   ├── ocorrencia/
│   ├── pushTokens/                 # Novo
│   └── solicitacoes/
├── styles/            # Tokens NativeWind extras
└── util/              # Helpers genéricos
```

### Domínios funcionais

| Domínio          | Tela                          | Service                          |
|------------------|-------------------------------|----------------------------------|
| Login/Auth       | `screens/login`               | `services/login` + AuthContext   |
| Home             | `screens/home`                | `services/home`                  |
| Boletim          | `screens/boletim`             | `services/boletim`               |
| Frequência       | `screens/frequencia`          | `services/frequencia`            |
| Horários         | `screens/horarios`            | `services/horario`               |
| Calendário       | `screens/calendarioEscolar`   | `services/calendarioEscolar`     |
| Mural            | `screens/mural`               | `services/mural`                 |
| Ocorrências      | `screens/ocorrencia`          | `services/ocorrencia`            |
| Conteúdo         | `screens/conteudo`            | `services/conteudo`              |
| Solicitações     | `screens/solicitacoes`        | `services/solicitacoes`          |
| Autorizações     | `screens/autorizacoes`        | `services/autorizacoes`          |
| **Notificações** | `screens/notificacoes`        | `services/notificacoes` + `services/pushTokens` |

Padrão: cada nova feature segue `screens/<x>` ↔ `services/<x>`.

### Camada HTTP

- **`services/api.tsx`** — Cliente axios para a API legada (`EXPO_PUBLIC_URL_API`). Header `Authorization: <token>` (sem Bearer).
- **`services/apiNotifications.tsx`** — Cliente axios separado para `app/api` (`EXPO_PUBLIC_NOTIF_API_URL`). Header `Authorization: Bearer <token>` (formato `@fastify/jwt`).

Ambos lêem token do `expo-secure-store` via interceptor.

### Persistência local

`expo-sqlite` + drizzle-orm. Migrações via `drizzle-kit`. Uso típico: cache offline e dados do aluno. **Diferente** do banco do `app/api` (SQL Server).

### Estilo

NativeWind transpila Tailwind para RN styles. Config em [app/mobile/tailwind.config.js](./app/mobile/tailwind.config.js). Cores temáticas (`edu.primary`, etc.) em [app/mobile/src/constants/colors.ts](./app/mobile/src/constants/colors.ts) — fonte única de verdade para cores fora de Tailwind (ex: `StatusBar`).

`clsx` + `tailwind-merge` para composição condicional de classes.

### TypeScript

- Strict ligado em [app/mobile/tsconfig.json](./app/mobile/tsconfig.json)
- Types globais em [app/mobile/educonecta.d.ts](./app/mobile/educonecta.d.ts)
- Sem path aliases configurados

## app/api

### Stack

| Camada        | Tecnologia                                       |
|---------------|--------------------------------------------------|
| Runtime       | Node 20+, Fastify 5                              |
| Linguagem     | TypeScript 5.6 (strict, ESM NodeNext)            |
| ORM           | Prisma 5 com provider `sqlserver`                |
| DB            | SQL Server (mesma instância da API legada)       |
| Auth          | `@fastify/jwt` (compartilha `JWT_SECRET`)        |
| Push          | `expo-server-sdk` (Expo Push Service)            |
| Cron          | `node-cron`                                      |
| Validação     | zod                                              |
| Testes        | vitest + supertest                               |

Manifesto: [app/api/package.json](./app/api/package.json).

### Estrutura de pastas (api)

```
app/api/
├── prisma/
│   └── schema.prisma          # PushToken, PresencaEvento, Notificacao
├── src/
│   ├── server.ts              # buildApp + bootstrap
│   ├── config.ts              # zod env var validation
│   ├── db.ts                  # Prisma client singleton
│   ├── plugins/
│   │   ├── prisma.ts          # decorator app.prisma
│   │   └── auth.ts            # @fastify/jwt + decorator app.authenticate
│   ├── routes/
│   │   ├── webhook.ts         # POST /webhook/presenca
│   │   ├── pushTokens.ts      # POST/DELETE /push-tokens
│   │   └── notificacoes.ts    # GET / PATCH /notificacoes
│   ├── services/
│   │   ├── pushDispatcher.ts  # fan-out + Expo Push
│   │   └── retryWorker.ts     # cron de retry
│   └── lib/
│       ├── hmac.ts            # HMAC-SHA256 timing-safe
│       ├── time.ts            # formatHora pt-BR
│       ├── expoClient.ts      # wrapper expo-server-sdk
│       └── errors.ts          # AppError + isPrismaUniqueViolation
└── tests/
    ├── unit/                  # 18 tests (hmac, time, errors)
    └── integration/           # placeholder pra testcontainers
```

### Endpoints

| Método | Rota                        | Auth        | O quê                                                 |
|--------|-----------------------------|-------------|-------------------------------------------------------|
| GET    | `/health`                   | nenhuma     | health check + ping DB                                |
| POST   | `/webhook/presenca`         | HMAC-SHA256 | recebe evento de FR API, persiste, dispara push       |
| POST   | `/push-tokens`              | JWT         | upsert token de device do responsável                 |
| DELETE | `/push-tokens/:id`          | JWT         | remove token (logout)                                 |
| GET    | `/notificacoes`             | JWT         | lista paginada (cursor) das notificações do user      |
| PATCH  | `/notificacoes/:id/lida`    | JWT         | marca lida (idempotente)                              |
| PATCH  | `/notificacoes/lidas-todas` | JWT         | marca todas lidas                                     |

Detalhes de payload e respostas: [docs/superpowers/specs/2026-05-06-notificacoes-presenca-design.md](./docs/superpowers/specs/2026-05-06-notificacoes-presenca-design.md).

### Fluxo do webhook (Approach 3 — async in-process)

```
[Leitor facial]
    ↓
[API FR Node — separada, fora do monorepo]
    ↓ POST /webhook/presenca (HMAC + eventId UUID)
[app/api WebhookController]
    ├─ valida HMAC + timestamp 5min
    ├─ valida payload (zod)
    ├─ resolve aluno por matrícula
    ├─ persiste PresencaEvento (eventId UNIQUE → idempotência)
    ├─ responde 200 imediato
    └─ setImmediate → PushDispatcher.dispatch(eventoId)
                          ↓
                    [PushDispatcher]
                       ├─ inclui aluno → responsáveis → user → pushTokens
                       ├─ cria 1 Notificacao por responsável
                       ├─ envia batch pra Expo Push
                       ├─ atualiza status (enviada/falhou) por user
                       └─ remove tokens DeviceNotRegistered
                          ↓
                    [Expo Push Service]
                          ↓ FCM/APNS
                    [app/mobile expo-notifications]

Cron a cada 5min: RetryWorker reprocessa Notificacao status=falhou (max 5 tentativas, janela 24h)
```

### Persistência

`expo-sqlite` (mobile, drizzle) **≠** SQL Server (api, Prisma). Stacks diferentes porque servem propósitos distintos: cache local no device vs persistência centralizada.

Tabelas novas (criadas via `prisma migrate`):
- `PushToken` — id, userId, token UNIQUE, platform, deviceId, timestamps
- `PresencaEvento` — id, eventId UNIQUE, alunoId, tipo, ocorridoEm, recebidoEm, leitorId
- `Notificacao` — id, userId, eventoId, titulo, corpo, status, tentativas, ultimoErro, enviadaEm, lidaEm, criadaEm

Tabelas existentes (`User`, `Aluno`, `AlunoResponsavel`): introspectadas via `prisma db pull` quando banco real estiver acessível. Após pull, adicionar relações inversas (`pushTokens`, `notificacoes`, `eventos`) nos models existentes.

### Segurança

- HMAC-SHA256 no webhook, secret 32+ bytes em `FR_WEBHOOK_SECRET`
- Anti-replay 5min, comparação `crypto.timingSafeEqual`
- JWT em endpoints de mobile (mesmo `JWT_SECRET` da API legada)
- Push tokens: dono lê/deleta apenas os próprios
- Notificações filtradas por `userId` (extraído do JWT, nunca do body)

### Build/Dev

| Comando                  | Função                            |
|--------------------------|-----------------------------------|
| `npm run api:dev`        | tsx watch (hot reload)            |
| `npm run api:test`       | vitest run                        |
| `npm run api:build`      | tsc → dist/                       |
| `npm run api -- run prisma:generate` | gera Prisma client    |
| `npm run api -- run prisma:migrate`  | cria migration + aplica |
| `npm run api -- run prisma:pull`     | introspecta DB existente |

## Build/Dev — mobile

| Comando                | Função                       |
|------------------------|------------------------------|
| `npm run mobile:start` | Metro bundler / dev server   |
| `npm run mobile -- run android` | Build + run Android nativo (não rodar sem pedido) |
| `npm run mobile -- run ios`     | Build + run iOS nativo (não rodar sem pedido)   |
| `npm run mobile -- run web`     | Versão web (Expo)            |

## Git

Branch principal: `main`. Branches feature: `feat/<descricao>`. Commits em português com prefixos `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.

## Referências cruzadas

- Regras operacionais e modo caveman: [CLAUDE.md](./CLAUDE.md)
- Spec de notificações de presença: [docs/superpowers/specs/2026-05-06-notificacoes-presenca-design.md](./docs/superpowers/specs/2026-05-06-notificacoes-presenca-design.md)
- Plan de implementação: [docs/superpowers/plans/2026-05-06-notificacoes-presenca.md](./docs/superpowers/plans/2026-05-06-notificacoes-presenca.md)
- Tipos globais mobile: [app/mobile/educonecta.d.ts](./app/mobile/educonecta.d.ts)
- Manifest Expo: [app/mobile/app.json](./app/mobile/app.json)
- Schema Prisma: [app/api/prisma/schema.prisma](./app/api/prisma/schema.prisma)
