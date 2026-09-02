# Notificações de Presença — Design

**Status:** Aprovado
**Data:** 2026-05-06
**Autor:** Mateus + Claude (caveman mode)

## Contexto

EduConecta é app mobile (Expo/RN) que conecta alunos, responsáveis e escola. Existe um sistema separado de reconhecimento facial (FR) que registra presença quando aluno passa pelo leitor na entrada da escola. Este spec define a integração entre o sistema FR e o app EduConecta para entregar notificações push aos responsáveis em tempo real, com histórico in-app.

## Objetivo

Quando um aluno é reconhecido no leitor facial, todos seus responsáveis legais cadastrados recebem uma notificação push no app EduConecta informando entrada (e futuramente saída). Notificações também ficam disponíveis em uma tela de histórico dentro do app.

## Escopo

### Incluído

- Webhook recebendo eventos do sistema FR (entrada e saída — saída suportada por schema mas não disparada hoje)
- Autenticação de webhook via HMAC-SHA256
- Idempotência por `eventId` único do FR
- Fan-out para múltiplos responsáveis por aluno (relação N:M)
- Múltiplos devices por responsável (mais de um push token por usuário)
- Push notifications via Expo Push Service
- Persistência de notificações em SQL Server (histórico)
- Tela in-app de notificações com paginação cursor, marcar como lida, pull-to-refresh
- Retry automático via cron para falhas
- Reestruturação do projeto em monorepo (`app/mobile` + `app/api`)

### Não incluído (fase 2+)

- Notificações de atraso/falta (precisariam cron + regra de horário escolar)
- Foto do aluno na notificação
- Quiet hours / preferências de notificação por responsável
- Métricas Prometheus / observabilidade avançada
- Endpoint de exportação/exclusão LGPD (avaliar se já existe na API atual)
- Migração do BullMQ/Redis (Approach 2) caso volume cresça

## Decisões arquiteturais

### Topologia

```
[Leitor facial] → [API FR (Node, separada)] --POST webhook HMAC--> [app/api (Fastify)] 
                                                                          ↓
                                                                   setImmediate
                                                                          ↓
                                                                   [PushDispatcher]
                                                                          ↓
                                                                   [Expo Push Service] → FCM/APNS → [app/mobile]

Cron a cada 5min: app/api re-tenta notificações com status='falhou'
```

APIs separadas (FR e app), comunicam via webhook HTTP unidirecional. Sem acoplamento de DB ou domínio.

### Stack escolhida

- `app/api`: **Fastify + Prisma + SQL Server** + Node 20+
- `app/mobile`: **Expo SDK 54 + drizzle-orm + SQLite** (cache local — sem mudança de stack)
- Push: **Expo Push Service** (abstrai FCM+APNS, grátis, integrado com `expo-notifications`)

### Approach de processamento (Approach 3 — async in-process)

Webhook handler responde 200 imediato após persistir o evento. Push é despachado via `setImmediate()` fora do request loop. Cron de 5 minutos reprocessa notificações `falhou`. Sem Redis/BullMQ no MVP. Migração para Approach 2 (BullMQ + Redis) é trivial caso o volume cresça.

### Modelo de relacionamento

- 1 responsável → N alunos (filhos)
- 1 aluno → N responsáveis (pai, mãe, avó, etc.)
- Login por CPF do responsável; sistema retorna alunos vinculados
- Push token vinculado ao **responsável** (User), não ao aluno
- Independente do aluno selecionado no `AlunoContext` do app, todas as notificações dos filhos chegam

### Idempotência

`eventId` (UUID) gerado pelo FR no momento da marcação. App API tem coluna `eventId UNIQUE` em `PresencaEvento`. Inserção duplicada falha por constraint, é detectada e retorna `{duplicate: true}`. FR pode parar de retentar.

### Segurança do webhook

- HTTPS obrigatório
- HMAC-SHA256 com secret 32+ bytes (env var `FR_WEBHOOK_SECRET`)
- Header `X-Signature: sha256=<hex>`, computado sobre `${timestamp}.${rawBody}`
- Header `X-Timestamp` validado em janela de 5 minutos (anti-replay)
- Comparação `crypto.timingSafeEqual`
- Rate limit 1000 req/min por IP

## Estrutura monorepo

```
educonecta/
├── package.json              # workspaces npm
├── app/
│   ├── mobile/               # Código Expo atual move pra cá
│   │   ├── App.tsx
│   │   ├── src/
│   │   ├── package.json
│   │   └── ...
│   └── api/                  # Novo backend Node.js
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── server.ts
│       │   ├── plugins/      # Fastify plugins (auth, hmac, prisma)
│       │   ├── routes/
│       │   │   ├── webhook.ts
│       │   │   ├── pushTokens.ts
│       │   │   └── notificacoes.ts
│       │   ├── services/
│       │   │   ├── pushDispatcher.ts
│       │   │   └── retryWorker.ts
│       │   └── lib/
│       │       ├── hmac.ts
│       │       └── expoClient.ts
│       ├── tests/
│       └── package.json
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-06-notificacoes-presenca-design.md
├── CLAUDE.md
└── context.md
```

`app/shared/` pode ser adicionado depois para tipos compartilhados (ex: `WebhookPayload`).

## Data model

Tabelas **novas** (criadas via Prisma migration). `User`, `Aluno`, `AlunoResponsavel` já existem no banco da API atual e são introspectadas via `prisma db pull`.

```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

model PushToken {
  id          String    @id @default(uuid())
  userId      String                            // FK pra User existente
  token       String    @unique                 // ExponentPushToken[xxx]
  platform    String                            // "ios" | "android"
  deviceId    String?
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime  @default(now())

  @@index([userId])
}

model PresencaEvento {
  id            String        @id @default(uuid())
  eventId       String        @unique           // UUID do FR (idempotência)
  alunoId       String                          // FK pra Aluno existente
  tipo          String                          // "entrada" | "saida"
  ocorridoEm    DateTime
  recebidoEm    DateTime      @default(now())
  leitorId      String?
  notificacoes  Notificacao[]

  @@index([alunoId, ocorridoEm])
}

model Notificacao {
  id          String           @id @default(uuid())
  userId      String                              // FK pra User existente (destinatário)
  eventoId    String
  titulo      String
  corpo       String
  status      String           @default("pendente")  // pendente | enviada | falhou | lida
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

Após `prisma db pull` trazer os modelos existentes, adicionar relações inversas:

```prisma
model User {
  // ... campos existentes
  pushTokens    PushToken[]
  notificacoes  Notificacao[]
}

model Aluno {
  // ... campos existentes
  eventos       PresencaEvento[]
}
```

## Endpoints REST (`app/api`)

### `POST /webhook/presenca`

Recebido do FR API. Auth: HMAC.

**Headers**: `X-Signature: sha256=<hex>`, `X-Timestamp: <unix_seconds>`, `Content-Type: application/json`

**Body**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "alunoMatricula": "2025001",
  "tipo": "entrada",
  "ocorridoEm": "2026-05-06T07:32:15.000Z",
  "leitorId": "leitor-portao-principal"
}
```

**Respostas**:

| Code | Cenário | Body |
|---|---|---|
| 200 | Processado | `{ "received": true, "duplicate": false }` |
| 200 | Duplicado (eventId já existe) | `{ "received": true, "duplicate": true }` |
| 400 | Schema inválido | `{ "error": "validation", "details": [...] }` |
| 401 | HMAC inválido ou timestamp expirado | `{ "error": "invalid_signature" }` |
| 404 | Aluno não encontrado | `{ "error": "aluno_not_found" }` |
| 500 | Erro interno | `{ "error": "internal" }` (FR retenta) |

**Por que matrícula?** FR identifica aluno pela leitura facial → matrícula no FR DB. App API resolve `matricula → alunoId` via Prisma.

### `POST /push-tokens`

Auth: JWT do responsável.

**Body**: `{ "token": "ExponentPushToken[...]", "platform": "android" | "ios", "deviceId"?: string }`

Idempotente (token UNIQUE). Se já existe, atualiza `lastUsedAt`.

**Resposta**: `200 OK { "id": "..." }` ou `201 Created`

### `DELETE /push-tokens/:id`

Auth: JWT. Apenas dono pode deletar (`userId == jwt.userId`). Chamado no logout.

**Resposta**: `204 No Content`

### `GET /notificacoes`

Auth: JWT.

**Query**: `cursor?` (id da última notificação da página anterior), `limit=20`, `status?`

**Resposta**:
```json
{
  "items": [
    {
      "id": "...",
      "titulo": "Júlia chegou na escola",
      "corpo": "Entrada registrada às 07:32",
      "alunoNome": "Júlia Silva",
      "tipo": "entrada",
      "ocorridoEm": "2026-05-06T07:32:15.000Z",
      "lidaEm": null,
      "criadaEm": "2026-05-06T07:32:16.123Z"
    }
  ],
  "nextCursor": "..."
}
```

Default exclui `pendente` e `falhou` (só `enviada`/`lida`). Ordem: `criadaEm DESC`.

### `PATCH /notificacoes/:id/lida`

Auth: JWT. Marca como lida (idempotente). Apenas destinatário.

**Resposta**: `204 No Content`

### `PATCH /notificacoes/lidas-todas`

Auth: JWT. Marca todas as do user como lidas.

**Resposta**: `204 No Content`

### `GET /health`

Sem auth. Retorna `200 { "status": "ok" }`.

## Fluxo do webhook (pseudocódigo)

```typescript
async function handlePresenca(req, reply) {
  // 1. Valida HMAC + timestamp window 5min
  if (!validHmac(req)) return reply.code(401).send({ error: 'invalid_signature' });

  // 2. Schema validation (Fastify JSON Schema)
  const { eventId, alunoMatricula, tipo, ocorridoEm, leitorId } = req.body;

  // 3. Resolve aluno
  const aluno = await prisma.aluno.findUnique({ where: { matricula: alunoMatricula } });
  if (!aluno) return reply.code(404).send({ error: 'aluno_not_found' });

  // 4. Persiste evento (idempotente via eventId UNIQUE)
  let evento, duplicate = false;
  try {
    evento = await prisma.presencaEvento.create({
      data: { eventId, alunoId: aluno.id, tipo, ocorridoEm: new Date(ocorridoEm), leitorId }
    });
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      duplicate = true;
      evento = await prisma.presencaEvento.findUnique({ where: { eventId } });
    } else throw e;
  }

  // 5. Resposta imediata
  reply.code(200).send({ received: true, duplicate });

  // 6. Fan-out fora do request loop
  if (!duplicate) setImmediate(() => pushDispatcher.dispatch(evento.id).catch(logError));
}
```

## PushDispatcher

```typescript
async function dispatch(eventoId: string) {
  const evento = await prisma.presencaEvento.findUnique({
    where: { id: eventoId },
    include: {
      aluno: {
        include: {
          responsaveis: {
            include: { user: { include: { pushTokens: true } } }
          }
        }
      }
    }
  });

  const titulo = `${evento.aluno.nome} ${evento.tipo === 'entrada' ? 'chegou' : 'saiu'}`;
  const corpo = `${capitalize(evento.tipo)} registrada às ${formatHora(evento.ocorridoEm)}`;

  // Cria 1 notificação por responsável
  const notificacoes = await prisma.$transaction(
    evento.aluno.responsaveis.map(rel =>
      prisma.notificacao.create({
        data: { userId: rel.userId, eventoId: evento.id, titulo, corpo, status: 'pendente' }
      })
    )
  );

  // Coleta tokens
  const tokens = evento.aluno.responsaveis.flatMap(rel => rel.user.pushTokens);
  if (tokens.length === 0) {
    await prisma.notificacao.updateMany({
      where: { id: { in: notificacoes.map(n => n.id) } },
      data: { status: 'falhou', ultimoErro: 'no_push_tokens' }
    });
    return;
  }

  // Envia em batch (Expo aceita até 100/req)
  const messages = tokens.map(t => ({
    to: t.token,
    title: titulo,
    body: corpo,
    data: { eventoId: evento.id, alunoId: evento.aluno.id, tipo: evento.tipo },
    sound: 'default',
    priority: 'high'
  }));
  const tickets = await expoClient.sendPushNotificationsAsync(messages);

  // Atualiza status por token
  for (let i = 0; i < tokens.length; i++) {
    const ticket = tickets[i];
    const tokenRow = tokens[i];
    const userId = findOwnerOfToken(tokenRow.id, evento.aluno.responsaveis);
    const notif = notificacoes.find(n => n.userId === userId);

    if (ticket.status === 'ok') {
      await prisma.notificacao.update({
        where: { id: notif.id },
        data: { status: 'enviada', enviadaEm: new Date(), tentativas: { increment: 1 } }
      });
    } else {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await prisma.pushToken.delete({ where: { id: tokenRow.id } });
      }
      await prisma.notificacao.update({
        where: { id: notif.id },
        data: { status: 'falhou', ultimoErro: ticket.message, tentativas: { increment: 1 } }
      });
    }
  }
}
```

## RetryWorker (cron)

```typescript
// node-cron, a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  const falhadas = await prisma.notificacao.findMany({
    where: {
      status: 'falhou',
      tentativas: { lt: 5 },
      criadaEm: { gt: new Date(Date.now() - 24 * 3600 * 1000) }
    },
    take: 100
  });
  for (const notif of falhadas) {
    await pushDispatcher.retry(notif.id).catch(logError);
  }
});
```

Limites: max 5 tentativas, janela 24h, batch 100 por execução.

## Mobile (`app/mobile`)

### Dependências novas

```bash
npx expo install expo-notifications expo-device
```

### Plugin no `app.json`

```json
{
  "expo": {
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#<colors.edu.primary>",
        "defaultChannel": "presenca"
      }]
    ]
  }
}
```

### Hook `useExpoPushToken`

`app/mobile/src/hooks/useExpoPushToken.ts` — pede permissão, pega token Expo, registra no backend após login. Skip em emulador (`Device.isDevice`).

### Listener de tap

`app/mobile/src/hooks/useNotificationListener.ts` — `addNotificationResponseReceivedListener` → navega para tela `Notificacoes`. Configura `setNotificationHandler` para mostrar alert no foreground.

### Services

- `app/mobile/src/services/pushTokens/index.ts` — `registerPushToken`, `unregisterPushToken`
- `app/mobile/src/services/notificacoes/index.ts` — `listarNotificacoes`, `marcarLida`, `marcarTodasLidas`

### Tela

```
src/screens/notificacoes/
├── index.tsx              # FlatList com infinite scroll
├── NotificacaoItem.tsx
└── EmptyState.tsx
```

Pull-to-refresh. Cursor pagination. Badge no tab bar com não-lidas. Tap → marca lida + navega pra detalhe (futuro: boletim/frequencia do aluno relacionado).

### Rota nova

`app/mobile/src/routes/index.tsx` — adicionar tab "Notificações" no bottom-tabs. Tipagem em `educonecta.d.ts`:

```ts
export type RootStackParamList = {
  // ... existentes
  Notificacoes: undefined;
};
```

## Edge cases

| Cenário | Comportamento |
|---|---|
| FR retenta webhook (timeout, network) | `eventId` UNIQUE bloqueia, retorna `duplicate: true` |
| Aluno sem responsáveis cadastrados | Evento persistido, sem notificação criada (log warn) |
| Responsável sem tokens (não logou no app ainda) | Notificação `status='falhou'`, retentada via cron |
| Token inválido (`DeviceNotRegistered`) | Token removido do DB, não retenta |
| Expo API down | `falhou`, cron retenta |
| Processo cai entre `200` e push | Notificações ficam `pendente`, cron pega |
| HMAC inválido | 401, log warn (possível ataque) |
| Schema inválido | 400, FR corrige |
| Matrícula não encontrada | 404, FR loga (matrícula errada / aluno deletado) |

## Segurança

- HTTPS obrigatório (TLS no reverse proxy)
- HMAC-SHA256, secret 32+ bytes em `FR_WEBHOOK_SECRET`
- Anti-replay 5min, comparação timing-safe
- Rate limit 1000 req/min/IP em `/webhook/*`
- JWT verify em rotas autenticadas (`userId` do JWT, nunca do body)
- Push tokens: dono lê/deleta apenas os próprios
- CORS restrito (mobile bundle ID + `*.educonecta.com`)

### LGPD

- Notificação carrega só nome curto + horário, sem foto
- Push notif visível em lockscreen → corpo sucinto
- Logs sem PII em prod
- Endpoint de exclusão (direito ao esquecimento) avaliado em fase 2

### Secrets

- `.env` em `app/api`, gitignored
- Prod: secrets manager
- Vars: `DATABASE_URL`, `FR_WEBHOOK_SECRET`, `JWT_SECRET`, `EXPO_ACCESS_TOKEN`

## Testes

### `app/api` (Vitest + Supertest)

| Tipo | O quê |
|---|---|
| Unit | `hmacVerify`, `buildNotificationMessage`, `dedupeEvent` |
| Integration | `POST /webhook/presenca` (válido, HMAC inválido, timestamp expirado, duplicado, aluno não encontrado) |
| Integration | `PushDispatcher.dispatch` mockando Expo client, asserta status correto na DB |
| Integration | Cron retry pega só falhadas dentro da janela, respeita `tentativas < 5` |
| Integration | `GET /notificacoes` paginação cursor, filtro status, isolamento por user |
| Integration | `POST /push-tokens` idempotência |

DB de teste: SQL Server em Docker via testcontainers.

### `app/mobile` (Jest + RNTL)

| Tipo | O quê |
|---|---|
| Unit | `useExpoPushToken` — registra após permissão, no-op em emulador |
| Unit | `services/notificacoes` — chama endpoints com headers corretos |
| Component | `NotificacaoItem` — renderiza lida/não-lida, formata hora |
| Component | `NotificacoesScreen` — pull-to-refresh, infinite scroll, empty state |

### Manual / smoke E2E

- Simular `curl` assinado em `POST /webhook/presenca` → ver push chegar no device de teste → abrir app → ver na tela → marcar lida
- Tap na notif (background + fechado) abre tela correta

## Deploy / infra

- `app/api`: Node 20+, container Docker, atrás de nginx/caddy com TLS
- DB: SQL Server existente (mesmo da API atual após migração)
- Cron: dentro do processo Fastify (`node-cron`). Se escalar horizontal, mover pra processo dedicado pra evitar duplicação.
- Sem Redis no MVP

## Migração / rollout

1. Criar estrutura monorepo: mover código atual pra `app/mobile/`, criar `app/api/` zerado
2. Configurar workspaces no `package.json` raiz
3. Implementar `app/api` com schema + endpoints + webhook + dispatcher + cron
4. `prisma db pull` no banco existente, adicionar relações inversas
5. Migration `prisma migrate dev` cria tabelas novas
6. Testes passando localmente
7. Deploy `app/api` em ambiente de homolog (env vars setadas)
8. Implementar mobile: hook + services + tela + rota
9. Build dev mobile, registra token, testa fluxo end-to-end com curl no webhook
10. Implementar webhook caller no FR API (fora do escopo deste spec — outro repo)
11. Smoke test em homolog
12. Promover pra prod

## Riscos / dependências

- **Banco compartilhado entre API atual e nova**: confirmar que `app/api` aponta pra mesma instância SQL Server. Senão precisa repensar (sync de Aluno/User).
- **JWT compatível**: `app/api` precisa decodificar o mesmo JWT emitido pela API atual. Garantir que `JWT_SECRET` é o mesmo.
- **FR API ainda não implementou caller**: webhook só funciona end-to-end quando FR API enviar. Mock via curl pra testes locais.
- **Volume escolar**: assumido baixo (eventos esparsos). Se escola grande com 10k+ alunos e horário concentrado, Approach 2 (BullMQ) pode ser necessário antes.

## Referências

- [CLAUDE.md](../../../CLAUDE.md) — diretrizes operacionais
- [context.md](../../../context.md) — arquitetura geral do EduConecta
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Fastify](https://fastify.dev/)
- [Prisma SQL Server](https://www.prisma.io/docs/orm/overview/databases/sql-server)
