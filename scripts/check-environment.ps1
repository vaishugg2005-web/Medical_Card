#Requires -Version 5.1
<#
.SYNOPSIS
    Medora EMQ-HS - Environment Diagnostics Script
.DESCRIPTION
    Checks Python 3.10, Node.js, npm, SQLite databases, .env configuration,
    ports, and editor availability without modifying anything.
#>

[CmdletBinding()]
param(
    [string]$Root = ""
)

if (-not $Root) {
    if ($PSScriptRoot) {
        $Root = (Split-Path -Parent $PSScriptRoot)
    } else {
        $Root = (Get-Location).Path
    }
}
$Root = (Resolve-Path $Root).Path
$BACKEND = Join-Path $Root 'backend'
$FRONTEND = Join-Path $Root 'frontend'
$VENV_PY = Join-Path $BACKEND '.venv\Scripts\python.exe'
$ENV_FILE = Join-Path $BACKEND '.env'

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " MEDORA - Environment Diagnostic Report" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Project Root : $Root" -ForegroundColor White
Write-Host ""

$issues = 0

# 1. Project Folders
Write-Host "[1] Checking Project Folders..." -ForegroundColor Yellow
if (Test-Path $BACKEND) {
    Write-Host "  OK   Backend folder: $BACKEND" -ForegroundColor Green
} else {
    Write-Host "  FAIL Backend folder missing!" -ForegroundColor Red; $issues++
}
if (Test-Path $FRONTEND) {
    Write-Host "  OK   Frontend folder: $FRONTEND" -ForegroundColor Green
} else {
    Write-Host "  FAIL Frontend folder missing!" -ForegroundColor Red; $issues++
}

# 2. Python & Virtual Environment
Write-Host "`n[2] Checking Python & Virtual Environment..." -ForegroundColor Yellow
if (Test-Path $VENV_PY) {
    $v = (& $VENV_PY --version 2>&1).ToString().Trim()
    if ($v -match '3\.10\.') {
        Write-Host "  OK   Venv Python ($v): $VENV_PY" -ForegroundColor Green
    } else {
        Write-Host "  WARN Venv Python is $v (expected 3.10.x)" -ForegroundColor Magenta
    }
} else {
    Write-Host "  WARN Virtual environment not yet created at backend\.venv" -ForegroundColor Magenta
}

$sysPy = (& python --version 2>&1).ToString().Trim()
Write-Host "  INFO System Python: $sysPy" -ForegroundColor Gray

# 3. Backend Dependencies
Write-Host "`n[3] Checking Backend Core Dependencies..." -ForegroundColor Yellow
if (Test-Path $VENV_PY) {
    & $VENV_PY -c "import fastapi, uvicorn, sqlalchemy, passlib, jwt, qrcode" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK   Core packages verified (fastapi, uvicorn, sqlalchemy, passlib, jwt, qrcode)" -ForegroundColor Green
    } else {
        Write-Host "  WARN Backend packages need to be installed from requirements.txt" -ForegroundColor Magenta
    }
} else {
    Write-Host "  INFO Skipped (venv not present)" -ForegroundColor Gray
}

# 4. Node.js & npm
Write-Host "`n[4] Checking Node.js & Frontend Environment..." -ForegroundColor Yellow
try {
    $nv = (& node --version 2>&1).ToString().Trim()
    Write-Host "  OK   Node.js: $nv" -ForegroundColor Green
} catch {
    Write-Host "  FAIL Node.js not found on PATH!" -ForegroundColor Red; $issues++
}
try {
    $npmv = (& npm --version 2>&1).ToString().Trim()
    Write-Host "  OK   npm: v$npmv" -ForegroundColor Green
} catch {
    Write-Host "  FAIL npm not found!" -ForegroundColor Red; $issues++
}
if (Test-Path (Join-Path $FRONTEND 'node_modules\.bin\vite.cmd')) {
    Write-Host "  OK   Frontend node_modules present (vite installed)" -ForegroundColor Green
} else {
    Write-Host "  WARN Frontend node_modules not yet installed" -ForegroundColor Magenta
}

# 5. Environment & Database
Write-Host "`n[5] Checking Environment & Databases..." -ForegroundColor Yellow
if (Test-Path $ENV_FILE) {
    Write-Host "  OK   backend/.env exists" -ForegroundColor Green
} else {
    Write-Host "  WARN backend/.env not found (will be copied from .env.example)" -ForegroundColor Magenta
}

$databases = @('medical_system.db', 'patient.db', 'doctor.db', 'admin.db')
foreach ($db in $databases) {
    $p = Join-Path $BACKEND $db
    if (Test-Path $p) {
        $kb = [math]::Round((Get-Item $p).Length / 1024, 1)
        Write-Host "  OK   Database: $db ($kb KB)" -ForegroundColor Green
    } else {
        Write-Host "  INFO Database: $db will be created on startup" -ForegroundColor Gray
    }
}

# 6. Ports Status
Write-Host "`n[6] Checking Port Status..." -ForegroundColor Yellow
$p8000 = netstat -ano 2>$null | Select-String ":8000\s"
if ($p8000) {
    Write-Host "  INFO Port 8000 in use" -ForegroundColor Cyan
} else {
    Write-Host "  OK   Port 8000 is free" -ForegroundColor Green
}
$p5173 = netstat -ano 2>$null | Select-String ":5173\s"
if ($p5173) {
    Write-Host "  INFO Port 5173 in use" -ForegroundColor Cyan
} else {
    Write-Host "  OK   Port 5173 is free" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
if ($issues -eq 0) {
    Write-Host " DIAGNOSTIC COMPLETE: Environment is ready for setup.bat" -ForegroundColor Green
} else {
    Write-Host " DIAGNOSTIC COMPLETE: Found $issues issue(s) needing attention." -ForegroundColor Red
}
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
