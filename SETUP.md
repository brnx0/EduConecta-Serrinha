# SETUP — Outra máquina

Guia completo pra rodar o monorepo `EduConecta` em uma máquina nova.

---

## Pré-requisitos (instalar antes)

| Tool | Versão | Como |
|---|---|---|
| **Node.js** | 20+ | https://nodejs.org |
| **JDK Temurin** | 17 | `winget install EclipseAdoptium.Temurin.17.JDK` |
| **Docker Desktop** | latest | https://docker.com/products/docker-desktop |
| **Android Studio** | latest | https://developer.android.com/studio |
| **Git** | latest | https://git-scm.com |

### Android SDK (via Android Studio)

1. Abre Android Studio → SDK Manager → SDK Platforms: marca **API 34** (mínimo) + **API 36**
2. SDK Tools: marca Build-Tools, Platform-Tools, Emulator, NDK 27.x
3. Cria AVD em Device Manager (Pixel 7, API 34 com Google Play)

### Variáveis de ambiente (Windows, permanente)

Win+R → `sysdm.cpl` → Variáveis de ambiente → Sistema:

```
ANDROID_HOME = C:\Users\<user>\AppData\Local\Android\Sdk
```

Edita `Path`, adiciona:

```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\cmdline-tools\latest\bin
```

Reinicia terminal. Confirma:

```powershell
java -version            # 17
adb --version
echo $env:ANDROID_HOME
```

---

## 1. Clone + deps

```powershell
cd C:\Projetos
git clone <url-repo> EduConecta
cd EduConecta
npm install
```

(Workspaces npm baixam deps de api + mobile + elo automaticamente.)

---

## 2. Docker SQL Server local (DEV)

Bootstrap completo (cria container + DB + schema + seed):

```powershell
.\infra\sqlserver\bootstrap.ps1
```

Em ~1 min sobe SQL Server na porta 1433 com banco `EDU_CORURIPE_M5_DEV`, schema legado mínimo, tabelas EDC_* + dados fake (1 responsável + 2 alunos).

Confirma:

```powershell
docker ps
# educonecta-sqlserver: Up healthy
```

**Login DEV:**
- CPF: `12345678901`
- Senha: `123456`

---

## 3. API (`app/api`)

### .env

```powershell
Copy-Item infra\sqlserver\.env.docker.example app\api\.env
```

Confere `app/api/.env` apontando pra `localhost:1433`.

### Prisma generate

```powershell
cd app\api
npx prisma generate
cd ..\..
```

### Sobe

```powershell
npm run api:dev
```

Esperado: `Server listening at http://127.0.0.1:3333`.

Health:
```powershell
curl http://localhost:3333/health
# {"status":"ok","db":"ok"}
```

Smoke login:
```powershell
Invoke-RestMethod -Uri http://localhost:3333/auth/login -Method Post -ContentType 'application/json' -Body '{"cpf":"12345678901","senha":"123456"}'
```

Deve retornar `{token, ...}`.

---

## 4. Mobile — escolhe app

Dois apps no monorepo. Funcionalmente iguais, visuais diferentes:

| App | Path | Brand | Status |
|---|---|---|---|
| **EduConecta** | `app/mobile` | Azul corporativo, layout original | legacy |
| **Élo** | `app/elo` | Laranja Recreio + MenuSheet | atual recomendado |

### .env mobile (emulador Android)

`app/elo/.env`:
```
EXPO_PUBLIC_NOTIF_API_URL="http://10.0.2.2:3333"
```

(`10.0.2.2` = mapeamento Android emulador → localhost host. Pra device físico USB, usa IP da rede local + libera firewall porta 3333.)

### Sobe emulador (Android Studio)

Device Manager → ▶ no AVD. Aguarda boot completo (~30s).

```powershell
adb devices
# emulator-5554   device
```

### Build dev (primeira vez)

```powershell
cd app\elo
npx expo prebuild --platform android --clean
npx expo run:android
```

Tempo: ~5 min (Gradle baixa + compila). APK instala automático + abre app.

### Próximas vezes (já buildado)

```powershell
npm run elo:start
# OU
cd app\elo
npx expo start --dev-client
```

App já instalado no emulador conecta automático ao Metro. Se ficar travado no splash laranja:

```powershell
adb reverse tcp:8081 tcp:8081
adb shell am force-stop com.mtspxdev.Elo
adb shell am start -W -a android.intent.action.VIEW -d "exp+elo://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.mtspxdev.Elo
```

---

## 5. Uso diário (rotina)

**Terminal 1 — API:**
```powershell
cd C:\Projetos\EduConecta
docker compose start sqlserver
npm run api:dev
```

**Terminal 2 — Mobile:**
```powershell
cd C:\Projetos\EduConecta\app\elo
npx expo start --dev-client
```

Emulador aberto + app Élo instalado → tudo conectado.

---

## 6. Parar tudo

```powershell
# Ctrl+C nos terminais 1 e 2

cd C:\Projetos\EduConecta
docker compose stop sqlserver
```

Dados do DB ficam (volume `educonecta_sqldata` persiste). Pra reset completo:

```powershell
docker compose down -v
.\infra\sqlserver\bootstrap.ps1
```

---

## Troubleshooting

### `adb` não reconhecido
Path com `%ANDROID_HOME%\platform-tools` não exportado na sessão. Fecha + abre terminal.

### Docker daemon não inicia
`wsl --update` + restart. Se persistir: Docker Desktop → Troubleshoot → Reset to factory.

### Build Android falha "SDK location not found"
Cria `app/elo/android/local.properties`:
```
sdk.dir=C\:\\Users\\<user>\\AppData\\Local\\Android\\Sdk
```

### Login 401 após mudança de schema
Token JWT antigo no Keychain mobile. Recreio detecta e limpa automático. Se persistir: força reload + novo login.

### Push notification não chega na barra
Emulador padrão Android Studio sem Google Play Services = FCM bloqueado. Use:
- Device físico Android (Google Play) ou
- Emulator system image com **Google Play** (não "Google APIs")
- Em DEV, simulador "Simular presença" usa **notif local** (funciona em qualquer emulador)

### `tsx` not found ao rodar API
`npm install` na raiz não rodou. Roda da raiz.

---

## Estrutura monorepo

```
EduConecta/
├── package.json              # workspaces npm (app/*)
├── docker-compose.yml        # SQL Server 2022 dev
├── CLAUDE.md                 # guia operacional do Claude
├── SETUP.md                  # este arquivo
├── infra/
│   └── sqlserver/
│       ├── seed/             # SQLs idempotentes (01_database, 02_legacy_schema, 03_edc_tables, 04_seed_data)
│       ├── bootstrap.ps1     # orquestra subida + seed
│       └── README.md         # detalhes Docker
└── app/
    ├── api/                  # Fastify 5 + Prisma 5 + mssql (porta 3333)
    ├── mobile/               # Expo SDK 54 — EduConecta (azul)
    └── elo/                  # Expo SDK 54 — Élo (laranja, atual)
```

---

## Credenciais DEV resumidas

| | |
|---|---|
| SQL Server SA | `DevStrong@Pass123` |
| DB name | `EDU_CORURIPE_M5_DEV` |
| App login CPF | `12345678901` |
| App login senha | `123456` |
| API JWT secret | `dev_secret_minimum_32_bytes_long_for_local_testing_only` |

Nunca usar em produção. Trocar tudo no deploy.
