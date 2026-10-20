<#
.SYNOPSIS
  Khoi dong nhanh moi truong dev: PostgreSQL (Docker) + Backend + Web.

.USAGE
  .\start.ps1               # chay day du
  .\start.ps1 -NoDb         # khong bat Docker/Postgres (da bat san)
  .\start.ps1 -NoBrowser    # khong tu mo trinh duyet

  Neu PowerShell chan script:
  powershell -ExecutionPolicy Bypass -File .\start.ps1
#>
param(
  [switch]$NoDb,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

# 1. Kiem tra backend/.env
if (-not (Test-Path "$root\backend\.env")) {
  Write-Host 'Thieu backend\.env. Chay: Copy-Item backend\.env.example backend\.env (roi sua secret)' -ForegroundColor Red
  exit 1
}

# 2. Bat PostgreSQL bang Docker va doi healthy
if (-not $NoDb) {
  Write-Step 'Bat PostgreSQL (Docker)'
  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker chua chay. Hay mo Docker Desktop roi chay lai (hoac dung -NoDb).' -ForegroundColor Red
    exit 1
  }
  npm run db:up
  if ($LASTEXITCODE -ne 0) { exit 1 }

  Write-Step 'Doi database san sang'
  $ready = $false
  for ($i = 1; $i -le 30; $i++) {
    $status = docker inspect -f '{{.State.Health.Status}}' secure-exam-db 2>$null
    if ($status -eq 'healthy') { $ready = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) {
    Write-Host 'Database chua san sang sau 60 giay. Kiem tra: docker logs secure-exam-db' -ForegroundColor Red
    exit 1
  }
}

# 3. Build shared mot lan (tranh hai cua so cung build de len nhau)
Write-Step 'Build package shared'
npm run build -w shared
if ($LASTEXITCODE -ne 0) { exit 1 }

# 4. Mo backend va web, moi thu mot cua so PowerShell rieng
Write-Step 'Mo Backend (http://localhost:3000/health)'
Start-Process powershell -WorkingDirectory $root -ArgumentList @(
  '-NoExit', '-Command',
  '$Host.UI.RawUI.WindowTitle = "Backend"; npm run dev -w backend'
)

Write-Step 'Mo Web (http://localhost:5173)'
Start-Process powershell -WorkingDirectory $root -ArgumentList @(
  '-NoExit', '-Command',
  '$Host.UI.RawUI.WindowTitle = "Web"; npm run dev -w web'
)

if (-not $NoBrowser) {
  Start-Sleep -Seconds 5
  Start-Process 'http://localhost:5173'
}

Write-Host ''
Write-Host 'Da khoi dong. Dong hai cua so Backend va Web de dung.' -ForegroundColor Green
Write-Host 'Tat database: npm run db:down' -ForegroundColor DarkGray
