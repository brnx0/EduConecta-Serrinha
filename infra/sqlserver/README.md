# SQL Server local (Docker) — DEV

Sobe um SQL Server 2022 no Docker com schema mínimo e dados fake pra testar o app sem depender do banco do cliente.

## Setup (uma vez)

1. Docker Desktop aberto e rodando.
2. Da raiz do monorepo:

```powershell
.\infra\sqlserver\bootstrap.ps1
```

O script:
- Sobe o container `educonecta-sqlserver` (porta 1433)
- Aguarda ficar healthy
- Aplica os 4 scripts SQL (database, schema legado, tabelas EDC_*, seed)

3. Copia `.env.docker.example` pra `app/api/.env`:

```powershell
Copy-Item infra\sqlserver\.env.docker.example app\api\.env
```

4. Sobe a API:

```powershell
npm run api:dev
```

5. Roda o mobile:

```powershell
npm run recreio:start
# ou
npm run mobile:start
```

## Login DEV

| | |
|---|---|
| CPF | `12345678901` |
| Senha | `123456` |

Maria Silva tem 2 filhos vinculados: Pedro (PES_COD 200) e Ana (PES_COD 201).

## Conexão SSMS / DBeaver

| | |
|---|---|
| Host | `localhost` |
| Porta | `1433` |
| Database | `EDU_CORURIPE_M5_DEV` |
| User | `sa` |
| Senha | `DevStrong@Pass123` |
| Trust cert | sim (self-signed) |

## Comandos úteis

```powershell
# Ver logs do SQL Server
docker logs -f educonecta-sqlserver

# Parar (mantém volume)
docker compose stop sqlserver

# Subir de novo
docker compose start sqlserver

# Resetar tudo (apaga dados!)
docker compose down -v
.\infra\sqlserver\bootstrap.ps1

# Conectar via sqlcmd dentro do container
docker exec -it educonecta-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'DevStrong@Pass123' -C

# Reaplicar só o seed (sem recriar tabelas)
docker exec educonecta-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'DevStrong@Pass123' -C -i /seed/04_seed_data.sql
```

## Estrutura

```
infra/sqlserver/
├── seed/
│   ├── 01_database.sql       — cria DB EDU_CORURIPE_M5_DEV
│   ├── 02_legacy_schema.sql  — tabelas GER_*/EDU_* mínimas
│   ├── 03_edc_tables.sql     — tabelas EDC_* (próprias do app)
│   └── 04_seed_data.sql      — dados fake (1 responsável + 2 alunos)
├── bootstrap.ps1             — orquestra subida + seed
├── .env.docker.example       — template de .env pra api
└── README.md                 — este arquivo
```

## O que NÃO está coberto

Schema legado mínimo cobre:
- Login + listagem de alunos
- Boletim (sem notas — tabela de notas não está no schema mínimo)
- Frequência (presenças marcadas como 'S' por default)
- Calendário (5 conteúdos diários + 1 atividade futura)
- Mural de avisos (vazio — sem tabela MUR_AVISO)
- Horários (vazio — sem tabela de aula/horário)
- Ocorrências (2 itens: 1 ciente + 1 pendente)
- Conteúdos (5 itens)
- Autorizações (2 itens — 1 aprovação, 1 presença)
- Solicitações (vazio — usuário cria pelo app)
- Notificações (vazio — testar via simular presença)

Pra fluxo de boletim/horários/avisos, schema legado precisaria expandir
(tabelas `EDU_AVALIACAO`, `EDU_DISCIPLINA_TURMA`, `MUR_AVISO`, etc.). Não foi
incluído porque não está no escopo do bootstrap mínimo.

## Mudar senha SA

Edita `docker-compose.yml` (`MSSQL_SA_PASSWORD`) + `bootstrap.ps1` (`$saPassword`)
+ `.env.docker.example` (`DATABASE_URL` + `LEGACY_DATABASE_URL`).
