<#
.SYNOPSIS
    Bootstrap do ambiente Docker + SQL Server pra dev.

.DESCRIPTION
    1. Sobe container `educonecta-sqlserver` via docker compose.
    2. Aguarda SQL Server ficar healthy.
    3. Roda os scripts de seed em ordem (01-04).

.EXAMPLE
    .\infra\sqlserver\bootstrap.ps1

.NOTES
    Requisitos: Docker Desktop rodando.
    Senha SA: DevStrong@Pass123 (definida no docker-compose.yml).
#>

$ErrorActionPreference = 'Stop'

$composeRoot = Resolve-Path "$PSScriptRoot\..\.."
$saPassword  = 'DevStrong@Pass123'
$container   = 'educonecta-sqlserver'

Push-Location $composeRoot
try {
    Write-Host "==> docker compose up -d sqlserver" -ForegroundColor Cyan
    docker compose up -d sqlserver
    if ($LASTEXITCODE -ne 0) { throw "docker compose up falhou" }

    Write-Host "==> Aguardando SQL Server ficar healthy..." -ForegroundColor Cyan
    $maxWait = 90
    $waited  = 0
    while ($waited -lt $maxWait) {
        $health = docker inspect -f '{{.State.Health.Status}}' $container 2>$null
        if ($health -eq 'healthy') {
            Write-Host "✓ SQL Server pronto." -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 3
        $waited += 3
        Write-Host ("  (" + $waited + "s) status: " + $health)
    }
    if ($waited -ge $maxWait) {
        throw "SQL Server não ficou healthy em ${maxWait}s. Verifique 'docker logs $container'."
    }

    # Detecta path correto do sqlcmd (pode estar em mssql-tools18 ou mssql-tools)
    $sqlcmdPath = $null
    foreach ($p in @('/opt/mssql-tools18/bin/sqlcmd', '/opt/mssql-tools/bin/sqlcmd')) {
        docker exec $container test -x $p
        if ($LASTEXITCODE -eq 0) { $sqlcmdPath = $p; break }
    }
    if (-not $sqlcmdPath) { throw "sqlcmd não encontrado no container." }
    Write-Host "==> sqlcmd: $sqlcmdPath" -ForegroundColor Cyan

    # mssql-tools18 exige -C (trust cert) já que cert é self-signed
    $extraArgs = if ($sqlcmdPath -like '*mssql-tools18*') { '-C' } else { '' }

    $scripts = @(
        '/seed/01_database.sql',
        '/seed/02_legacy_schema.sql',
        '/seed/03_edc_tables.sql',
        '/seed/04_seed_data.sql'
    )

    foreach ($script in $scripts) {
        Write-Host "==> Aplicando $script" -ForegroundColor Cyan
        if ($extraArgs) {
            docker exec $container $sqlcmdPath -S localhost -U sa -P $saPassword $extraArgs -i $script
        } else {
            docker exec $container $sqlcmdPath -S localhost -U sa -P $saPassword -i $script
        }
        if ($LASTEXITCODE -ne 0) { throw "Falha ao aplicar $script" }
    }

    Write-Host ""
    Write-Host "✓ Setup concluído!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Conexão:" -ForegroundColor Yellow
    Write-Host "  Host:     localhost"
    Write-Host "  Port:     1433"
    Write-Host "  Database: EDU_CORURIPE_M5_DEV"
    Write-Host "  User:     sa"
    Write-Host "  Password: $saPassword"
    Write-Host ""
    Write-Host "Login DEV no app:" -ForegroundColor Yellow
    Write-Host "  CPF:   12345678901"
    Write-Host "  Senha: 123456"
}
finally {
    Pop-Location
}
