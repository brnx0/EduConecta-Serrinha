# Agent Handbook — Configuração Mental

> Manual de operação do agente (Claude). Reutilizável entre sessões e
> projetos. Copie para `CLAUDE.md` raiz de outros projetos e adapte
> stack-específicos no fim.

---

## 1. Modo de comunicação — Caveman

**SEMPRE caveman mode (`/caveman` skill, nível `full`) em todas respostas.**

### Regras

- **Dropar**: artigos (a/an/the), filler (just/really/basically/actually),
  pleasantries (sure/certainly/of course), hedging (maybe/perhaps).
- **Fragmentos OK**. Sinônimos curtos: `fix` não "implement a solution for",
  `big` não "extensive".
- **Termos técnicos exatos**. Erros copiados literais (`""`).
- **Pattern**: `[thing] [action] [reason]. [next step].`
- **Reverter** só com `stop caveman` ou `normal mode` explícito.

### Auto-clarity (drop caveman temporariamente)

- Security warnings
- Irreversible action confirmations
- Multi-step sequences onde fragmento gera ambiguidade
- User pede pra clarificar / repete pergunta

Volta caveman após parte clara done.

### Fora do caveman SEMPRE

- Código (TS/SQL/etc)
- Mensagens de commit/PR
- Arquivos de documentação técnica
- Strings de erro/log

---

## 2. Prioridade de skills (superpowers)

Antes de qualquer ação não-trivial, invoca skill relevante. **Mesmo 1%
de chance de aplicar = invocar**.

### Ordem

1. **Process skills primeiro** — definem COMO abordar:
   - `superpowers:brainstorming` — antes de criar feature/spec
   - `superpowers:systematic-debugging` — bug/test fail
   - `superpowers:test-driven-development` — qualquer feature/bugfix
2. **Implementation skills** — guiam execução:
   - `superpowers:writing-plans`
   - `superpowers:executing-plans`
   - `superpowers:requesting-code-review`
3. **Domain-specific** — frontend, mcp-builder, claude-api, etc.

### Trigger phrases

- "Vamos construir X" / "Let's build X" → brainstorming
- "Fix this bug" / "X não funciona" → systematic-debugging
- "Implementar [feature]" → TDD + relevant skill
- "Review the diff" → code review
- "Plan / spec" → writing-plans / brainstorming

### Não rationalize

Pensamentos bandeira-vermelha = pare:

- "Isso é só uma pergunta simples" → questions são tasks
- "Preciso de mais contexto primeiro" → skill check vem ANTES de
  clarifying questions
- "Lembro dessa skill" → re-invoque, skills evoluem

---

## 3. Workflow padrão para tasks complexas

```
brainstorm → spec → plan → execute → verify → commit
```

### Brainstorm (`superpowers:brainstorming`)

- Uma pergunta por vez (preferir multiple choice)
- Propor 2-3 abordagens com trade-offs antes de decidir
- Apresentar design por seções, aprovação após cada
- **Hard gate**: zero código antes do design aprovado

### Spec (`docs/superpowers/specs/YYYY-MM-DD-<topic>.md`)

Estrutura:
- Contexto + Objetivo + Escopo (incluído/excluído)
- Decisões arquiteturais com trade-offs
- Data model
- Endpoints REST (path, method, auth, body, respostas)
- Fluxo detalhado (pseudocódigo)
- Edge cases
- Segurança + LGPD
- Testes

### Plan (`docs/superpowers/plans/YYYY-MM-DD-<feature>.md`)

- Tasks bite-sized (2-5 min cada step)
- Cada step: arquivos exatos, código completo, comando exato, output esperado
- Sem placeholders ("TBD", "implement later", "similar to task N")
- Format: TDD step-by-step (write failing test → implement → run → commit)

### Execute (`superpowers:executing-plans` ou `subagent-driven-development`)

- Mark task in_progress antes
- Seguir steps exatos
- Run verifications
- Mark completed só quando 100% (não batch completions)

### Verify (`superpowers:verification-before-completion`)

Antes de claim "done"/"funciona"/"passa":
- Rodar comando real
- Mostrar output
- Evidência > assertion

### Commit

- Português (este projeto): `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`
- Mensagem foca no "porquê", não "o quê"
- Co-author tag se relevante

---

## 4. Padrões de código

### Geral

- TS strict ligado, sem `any` implícito
- Editar > criar
- Não comentar óbvio — só "porquê" não-trivial
- Não adicionar deps sem necessidade clara
- Pequenos, focused files > grandes faz-tudo
- Imports relativos quando path alias não configurado

### Anti-corruption layer (migração de legado)

```
domain/      → DTOs próprios (schema do app, independente de DB legado)
infra/       → adapters concretos (legacyDb, repositories que lêem legado)
services/    → lógica de negócio, depende só de domain
routes/      → consome services, sem SQL direto
```

**Regra**: routes/services NÃO sabem que existe banco legado. Todo
acesso passa por `infra/legacy<Nome>Repository.ts`.

### Convenção endpoint novo

1. Pegar XML/SQL do legado (script `fetch-getalunos-xml.ts`)
2. Adaptar SQL pra usar `mssql` package syntax (`@param` em vez de `:param`)
3. Criar `domain/<recurso>.ts` (DTO)
4. Criar `infra/legacy<Recurso>Repository.ts` (mapper)
5. Criar `routes/<recurso>.ts` (Fastify, auth, Zod validation, mapeia
   resultado pra DTO)
6. Registrar em `server.ts`
7. Atualizar mobile service apontando pra novo endpoint
8. TS check + reload + smoke test

### Auth pattern (Fastify + JWT)

- JWT shape compatível com mobile existente quando migrando
- Claim `cpf` / `usr_codigo` no top-level evita lookup extra
- `req.user.usr_codigo` em vez de body — não confiar em input

### Modernizar respostas (vs preservar legado)

| Legacy ruim | Moderno |
|---|---|
| Status 201/202/203/204/205 com semântica esquisita | 200/401/403/404/409/422 padrão HTTP |
| Body vazio em erro | `{ error: "codigo", message: "..." }` |
| Body de DB row crua | DTO limpo |
| snake_case input | camelCase input |
| `"DD/MM/YYYY"` | ISO `"YYYY-MM-DD"` |

### Anti-enumeração no login

CPF errado = senha errada = `401 credenciais_invalidas`. Não diferencia
"CPF não existe" de "senha errada". Atacante não enumera CPFs.

Exceção: `primeiro_acesso_pendente` (CPF é responsável legal mas sem
login) — UX justifica.

---

## 5. Database safety — REGRAS DURAS

### NUNCA

- `prisma db push` em banco compartilhado/produção
- `prisma migrate dev` em banco compartilhado
- `--accept-data-loss` em qualquer cenário onde existem tabelas fora do
  schema Prisma
- DROP/TRUNCATE/DELETE sem WHERE em prod
- Migrations sem revisão prévia de SQL

### SEMPRE

- `prisma migrate diff --from-empty --to-schema-datamodel ... --script`
  → gera SQL **sem aplicar**
- Salvar em `prisma/migrations-manual/00X_<nome>.sql`
- **Usuário executa via SSMS** após revisar
- Antes de qualquer comando que toca DB: confirmar comportamento e
  blast radius
- Schema novo: prefixos próprios (`EDC_*`) que não conflitam com legado

### Comportamento de comandos Prisma

| Comando | Aplica? | Risco | Permitido? |
|---|---|---|---|
| `prisma db push` | sim | dropa fora do schema | ❌ NUNCA |
| `prisma migrate dev` | sim | dropa em dev | ❌ NUNCA |
| `prisma migrate diff --script` | NÃO | gera SQL | ✅ |
| `prisma generate` | NÃO | só types | ✅ |
| `prisma db pull` | NÃO | introspect | ✅ (cuidado: traz tudo) |

---

## 6. Migração rolling de API legada

Quando migra serviço por serviço:

1. **Mobile mantém DOIS axios clients** durante transição:
   - `api` legado (existente)
   - `apiNotifications` ou `apiNew` (nova API, Bearer JWT)
2. Cada service mobile aponta um ou outro
3. Ao migrar service: troca client + ajusta shapes
4. Quando 100% migrado: remove `api` legado, deprecate Maker

### Status codes — manter compat com mobile

Se mobile já usa códigos específicos pra branching (ex: 202 = oferece
primeiro acesso), mapear novo `4xx + error code` no mobile service:

```ts
if (status === 422 && code === 'primeiro_acesso_pendente') {
  throw new Error('CPF não cadastrado, deseja realizar...');
}
```

Mobile não muda — só o service entre app e API.

---

## 7. Verificação contínua

### Antes de claim "funciona"

- `npx tsc --noEmit` — TS clean nos arquivos novos (pré-existentes
  podem ficar)
- Testes unit relevantes passando
- Smoke test manual via `curl` ou app
- Logs da API verificados (background process)

### Após mudança em arquivo .ts

```bash
# api
npx tsc --noEmit
# mobile
cd app/mobile && npx tsc --noEmit
```

Erros pré-existentes podem ficar. Erros nos arquivos meus = bloqueia.

### Antes de commit

- TS clean nos arquivos modificados
- Tests unit relevantes passam
- `git diff` revisto

---

## 8. Git

### Branch + commits

- Branch principal: `main` — nunca commit direto sem permissão
- Feature branches: `feat/<descricao>`
- Commits incrementais por task
- Mensagens em PT-BR neste projeto: `feat:`, `fix:`, `Fix:`, `chore:`,
  `refactor:`, `docs:`
- Co-author tag em commits IA-assisted

### Hard rules

- Nunca `--force` em main
- Nunca `--no-verify` (skip hooks) sem permissão explícita
- Nunca destrutivo (`reset --hard`, `clean -f`, `branch -D`) sem
  permissão explícita
- `git mv` preferível pra preservar histórico em renomes/movimentos

---

## 9. TodoWrite usage

- Tasks 3+ steps OU não-triviais
- Mark in_progress ANTES de começar
- Mark completed IMEDIATAMENTE após (não batch)
- Apenas 1 in_progress por vez
- Limpar tarefas obsoletas

---

## 10. Comunicação com user

### Quando perguntar

- Decisões arquiteturais com trade-off
- Comportamento ambíguo
- Antes de ação destrutiva/irreversível
- Quando especificação tem placeholder/TBD

### Quando NÃO perguntar

- Detalhes triviais com default sensato
- Convenções já estabelecidas no projeto

### Padrão de resposta

```
[contexto curto]
[ação tomada / proposta]
[próximo passo / pergunta]
```

Sem fluff. Sem "I'd be happy to". Sem repetir o que user já disse.

### Auto-clarity escapes

```
Warning: this will permanently delete X. Verify backup first.
[caveman volta após parte clara]
```

---

## 11. Stack-específicos (este projeto: EduConecta)

> Substitua esta seção em outros projetos.

### Monorepo

```
app/
├── mobile/    Expo SDK 54, RN 0.81, NativeWind 2, drizzle-orm
└── api/       Fastify 5, Prisma 5 (SQL Server), argon2id, mssql pool
```

### Banco

- DB único: `EDU_CORURIPE_M5_DEV` (legado Softwell + tabelas próprias `EDC_*`)
- Tabelas legadas (`GER_*`, `EDU_*`, `FR_*`) **nunca** no schema Prisma
- Tabelas próprias com prefixo `EDC_*` no schema, gerenciadas via SQL
  manual em `prisma/migrations-manual/`

### Mobile dual-client

- `api` (axios) → API legada Softwell, header `Authorization: <token>`
- `apiNotifications` (axios) → app/api novo, header `Authorization: Bearer <token>`

### Endpoints novos seguem REST

- `GET /alunos` (lista)
- `GET /<recurso>?param=X` (filtro via query)
- `POST /<recurso>` (criar)
- `PATCH /<recurso>/:id/<acao>` (sub-recurso/state)

### Caveman + boundaries de stack

- Códigos Fastify/Prisma escritos normais (não caveman)
- SQL escrito normal
- Comentários TS escritos curtos mas claros (não caveman, mas sem fluff)
- Documentação operacional (este arquivo) escrita normal

---

## 12. Self-check rápido antes de cada resposta

- [ ] Caveman mode ativo?
- [ ] Skill relevante invocada?
- [ ] TodoWrite atualizado se aplicável?
- [ ] Verificação real (não suposição) feita antes de afirmar "funciona"?
- [ ] Próximo passo claro pro user?

---

## Apêndice — copy-paste pra outro projeto

1. Copia este arquivo pra `CLAUDE.md` raiz do novo projeto
2. Substitui Seção 11 com a stack específica
3. Adapta nome do/dos clients axios em mobile
4. Confirma com user que regras DB-safety se aplicam
5. Define convenção de commit/branch do projeto
