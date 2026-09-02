# CLAUDE.md

Guia operacional do Claude para o projeto **EduConecta** (monorepo).

> Para detalhes de arquitetura, stack e estrutura de pastas, veja [context.md](./context.md).

---

## Modo de comunicação

**SEMPRE usar caveman mode (`/caveman` skill) em todas as respostas.**

- Nível padrão: `full`
- Dropar artigos, filler, hedging, pleasantries
- Fragmentos OK
- Sinônimos curtos (fix, big, use)
- Termos técnicos exatos
- Código, commits, PRs, warnings de segurança: escrever normal
- Reverter só se usuário pedir `stop caveman` ou `normal mode`

## Estrutura monorepo

```
educonecta/
├── package.json              # workspaces npm (app/*)
├── docker-compose.yml        # SQL Server 2022 dev
├── SETUP.md                  # guia setup máquina nova
├── app/
│   ├── mobile/               # Expo RN — EduConecta (azul, legacy)
│   ├── elo/                  # Expo RN — Élo (laranja, atual recomendado)
│   └── api/                  # Fastify + Prisma — backend (porta 3333)
├── infra/
│   └── sqlserver/            # docker compose + bootstrap + seed SQL
└── docs/superpowers/         # specs e plans
```

Comandos via workspaces a partir da raiz:

```bash
# Mobile EduConecta (legacy)
npm run mobile:start          # expo start

# Mobile Élo (atual)
npm run elo:start             # expo start --dev-client
npm run elo:android           # expo run:android

# API
npm run api:dev               # tsx watch src/server.ts
npm run api:test              # vitest run
npm run api:build             # tsc

# Direto via workspace flag
npm install --workspace app/mobile <pkg>
npm install --workspace app/elo <pkg>
npm install --workspace app/api <pkg>
```

## Setup local (Docker SQL Server)

DB dev em container, com seed mínimo de schema legado + tabelas EDC_* + dados fake. Detalhes em `SETUP.md`.

```powershell
# Bootstrap completo (uma vez)
.\infra\sqlserver\bootstrap.ps1
Copy-Item infra\sqlserver\.env.docker.example app\api\.env

# Rotina diária
docker compose start sqlserver
npm run api:dev               # terminal 1
npm run elo:start             # terminal 2
```

Login DEV: CPF `12345678901` / senha `123456`.

## Stack — app/mobile

- **Runtime:** Expo SDK 54, React Native 0.81, React 19
- **Linguagem:** TypeScript strict
- **Navegação:** `@react-navigation/native` + bottom-tabs + native-stack
- **Estilo:** NativeWind 2 (Tailwind) + `tailwind-merge` + `clsx`
- **HTTP:** axios (2 clients: `api` para API legada, `apiNotifications` para `app/api`)
- **Persistência local:** expo-sqlite + drizzle-orm
- **Auth:** expo-secure-store + jwt-decode
- **Notificações:** expo-notifications + expo-device

## Stack — app/api

- **Runtime:** Node 20+, Fastify 5
- **Linguagem:** TypeScript strict, ESM (NodeNext)
- **ORM:** Prisma 5 com provider `sqlserver`
- **DB:** SQL Server (mesma instância da API legada após migração)
- **Auth:** `@fastify/jwt` (mesmo `JWT_SECRET` da API legada)
- **Push:** `expo-server-sdk` (Expo Push Service)
- **Cron:** `node-cron`
- **Validação:** zod
- **Testes:** vitest + supertest

## Convenções de código

### Geral
- TS strict ligado — sem `any` implícito
- Não comentar óbvio — só "porquê" não trivial
- Editar arquivos existentes > criar novos
- Não adicionar deps sem necessidade clara

### app/mobile
- Componentes funcionais + hooks
- Estilo via `className` (NativeWind), não `StyleSheet`
- Cores centralizadas em `src/constants/colors.ts`
- Contexts em `src/context/` aninhados em `App.tsx` ou `Routes`
- Services por domínio em `src/services/<dominio>/`
- Screens por domínio em `src/screens/<dominio>/`
- Hooks em `src/hooks/`
- Imports relativos, sem path alias (não configurado)

### app/api
- Plugins Fastify em `src/plugins/`, registrados em `buildApp` em `src/server.ts`
- Routes em `src/routes/<dominio>.ts`, registrados em `buildApp` com prefix
- Services (lógica de negócio) em `src/services/`
- Libs puras (HMAC, time, expo client, errors) em `src/lib/`
- Schema Prisma em `prisma/schema.prisma` — só tabelas próprias do domínio de notificação. Tabelas existentes (`User`, `Aluno`, `AlunoResponsavel`) virão via `prisma db pull` quando banco real estiver acessível.
- Tests em `tests/unit/` e `tests/integration/`
- Imports com extensão `.js` (ESM exige)

## Regras de trabalho

1. Editar arquivos existentes > criar novos
2. Não adicionar deps sem necessidade clara
3. Seguir padrão de pastas em [context.md#estrutura](./context.md#estrutura-monorepo)
4. Não comentar óbvio — só "porquê" não trivial
5. Não rodar `expo run:*` sem pedido explícito (build pesado)
6. Ao criar tela mobile nova: criar service correspondente em `app/mobile/src/services/<dominio>/`
7. Ao mexer em rota mobile: atualizar `app/mobile/src/routes/index.tsx` e tipagens em `RootStackParamList`
8. Ao criar endpoint REST novo na API: criar em `app/api/src/routes/<dominio>.ts` + service mobile correspondente em `app/mobile/src/services/<dominio>/` consumindo via `apiNotifications` axios client
9. Mobile usa `apiNotifications` (axios separado, header `Bearer <token>`) pra falar com `app/api`. Não confundir com `api` (axios legado, header `${token}` sem Bearer)
10. Cron e workers em `app/api/src/services/<nome>Worker.ts`, iniciados em `buildApp` quando `NODE_ENV !== 'test'`

## Git

- Branch principal: `main`
- Branches feature: `feat/<descricao-curta>`
- Commits em português, padrão atual: `feat:`, `fix:`, `Fix:`, `chore:`, `refactor:`, `docs:`
- Não commitar sem pedido explícito (exceto durante execução de plan aprovado)
- Nunca `--force` em main

## Referências

- Arquitetura e domínios: [context.md](./context.md)
- Spec de notificações: [docs/superpowers/specs/2026-05-06-notificacoes-presenca-design.md](./docs/superpowers/specs/2026-05-06-notificacoes-presenca-design.md)
- Plan de notificações: [docs/superpowers/plans/2026-05-06-notificacoes-presenca.md](./docs/superpowers/plans/2026-05-06-notificacoes-presenca.md)
- Tipos globais mobile: [app/mobile/educonecta.d.ts](./app/mobile/educonecta.d.ts)
- Cores/tema mobile: [app/mobile/src/constants/colors.ts](./app/mobile/src/constants/colors.ts)
- Entry point mobile: [app/mobile/App.tsx](./app/mobile/App.tsx)
- Entry point api: [app/api/src/server.ts](./app/api/src/server.ts)
