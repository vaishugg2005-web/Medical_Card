#Requires -Version 5.1
<#
.SYNOPSIS
    Medora EMQ-HS - One-Click Development Environment Setup Manager
.DESCRIPTION
    Validates all prerequisites, configures the environment, launches the backend
    and frontend in separate visible terminals, waits for readiness, and opens
    the Medora landing page in the default browser.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$Root
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- CONSTANTS ---
$BACKEND       = Join-Path $Root 'backend'
$FRONTEND      = Join-Path $Root 'frontend'
$VENV          = Join-Path $BACKEND '.venv'
$VENV_PY       = Join-Path $VENV 'Scripts\python.exe'
$REQUIREMENTS  = Join-Path $BACKEND 'requirements.txt'
$ENV_FILE      = Join-Path $BACKEND '.env'
$ENV_EXAMPLE   = Join-Path $Root '.env.example'
$EDITOR_CFG    = Join-Path $Root '.medora-editor.cfg'
$LOGS_DIR      = Join-Path $Root 'logs'
$LOG_FILE      = Join-Path $LOGS_DIR 'setup.log'

$BACKEND_HOST  = '127.0.0.1'
$BACKEND_PORT  = 8000
$FRONTEND_PORT = 5173
$BACKEND_URL   = "http://${BACKEND_HOST}:${BACKEND_PORT}"
$FRONTEND_URL  = "http://localhost:${FRONTEND_PORT}"
$HEALTH_URL    = "${BACKEND_URL}/health"

$TOTAL_STEPS   = 10
$script:Step   = 0

if (-not (Test-Path $LOGS_DIR)) {
    New-Item -ItemType Directory -Path $LOGS_DIR -Force | Out-Null
}

function Log-Message {
    param([string]$Msg)
    $ts = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    try {
        Add-Content -Path $LOG_FILE -Value "$ts  $Msg" -Encoding ASCII
    } catch {}
}

function Step-Header {
    param([string]$Msg)
    $script:Step++
    $line = "[{0}/{1}] {2}" -f $script:Step, $TOTAL_STEPS, $Msg
    Write-Host ""
    Write-Host $line -ForegroundColor Cyan
    Log-Message $line
}

function OK   { param([string]$m) Write-Host "  OK  $m" -ForegroundColor Green;   Log-Message "  OK  $m" }
function INFO { param([string]$m) Write-Host "  --  $m" -ForegroundColor Yellow;  Log-Message "  --  $m" }
function WARN { param([string]$m) Write-Host "  !!  $m" -ForegroundColor Magenta; Log-Message "  !!  $m" }
function ERR  { param([string]$m) Write-Host "  ERROR  $m" -ForegroundColor Red;  Log-Message "  ERROR  $m" }

function Fatal {
    param(
        [string]$Msg,
        [string]$Fix = ""
    )
    ERR $Msg
    if ($Fix -ne "") {
        Write-Host "         FIX: $Fix" -ForegroundColor Yellow
        Log-Message "         FIX: $Fix"
    }
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor Red
    Write-Host "   SETUP FAILED at step [$($script:Step)/$TOTAL_STEPS]" -ForegroundColor Red
    Write-Host "   Fix the error above, then run setup.bat again." -ForegroundColor Red
    Write-Host "  ============================================================" -ForegroundColor Red
    Log-Message "FATAL at step $($script:Step): $Msg"
    exit 1
}

# --- STEP 1: Project directories ---
Step-Header "Inspecting the Medora project..."
Log-Message "Root: $Root"

if (-not (Test-Path $BACKEND)) {
    Fatal "Backend directory not found: $BACKEND"
}
if (-not (Test-Path $FRONTEND)) {
    Fatal "Frontend directory not found: $FRONTEND"
}
if (-not (Test-Path $REQUIREMENTS)) {
    Fatal "requirements.txt not found: $REQUIREMENTS"
}
$pkgJsonPath = Join-Path $FRONTEND 'package.json'
if (-not (Test-Path $pkgJsonPath)) {
    Fatal "frontend/package.json not found: $pkgJsonPath"
}

OK "Root     : $Root"
OK "Backend  : $BACKEND"
OK "Frontend : $FRONTEND"

# --- STEP 2: Python 3.10 Check ---
Step-Header "Checking Python 3.10..."

$script:PY_FOR_VENV = $null
$venvAlreadyValid   = $false

if (Test-Path $VENV_PY) {
    try {
        $v = (& $VENV_PY --version 2>&1).ToString().Trim()
        if ($v -match '3\.10\.') {
            $venvAlreadyValid = $true
            OK "Existing venv Python found: $v"
        }
    } catch {}
}

if (-not $venvAlreadyValid) {
    $candidates = @('py -3.10', 'python3.10', 'python')
    foreach ($cand in $candidates) {
        try {
            $parts = $cand -split ' '
            $ver = (& $parts[0] $parts[1..($parts.Length-1)] --version 2>&1).ToString().Trim()
            if ($ver -match '3\.10\.') {
                $script:PY_FOR_VENV = $cand
                OK "Python 3.10 found via: $cand ($ver)"
                break
            }
        } catch {}
    }
    
    if (-not $script:PY_FOR_VENV) {
        $sysVer = (& python --version 2>&1).ToString().Trim()
        Fatal "Python 3.10 not found. System Python is $sysVer" "Install Python 3.10.x from https://www.python.org/downloads/ and add to PATH."
    }
}

# --- STEP 3: Virtual Environment ---
Step-Header "Creating or validating the virtual environment..."

$venvValid = $false
if (Test-Path $VENV_PY) {
    try {
        & $VENV_PY -c "import sys; sys.exit(0)" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $venvValid = $true }
    } catch {}
}

if ($venvValid) {
    $vv = (& $VENV_PY --version 2>&1).ToString().Trim()
    OK "Virtual environment valid: $VENV"
    OK "Venv Python: $vv"
} else {
    INFO "Virtual environment missing or invalid - creating..."
    if (Test-Path $VENV) {
        INFO "Removing invalid venv..."
        Remove-Item $VENV -Recurse -Force -ErrorAction SilentlyContinue
    }
    $parts = $script:PY_FOR_VENV -split ' '
    & $parts[0] $parts[1..($parts.Length-1)] -m venv $VENV 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Fatal "Failed to create virtual environment at $VENV" "Ensure Python 3.10 is installed and functional."
    }
    OK "Virtual environment created at $VENV"
    INFO "Upgrading pip..."
    & $VENV_PY -m pip install --upgrade pip --quiet 2>&1 | Out-Null
    OK "pip upgraded."
}

& $VENV_PY -c "import sys; sys.exit(0 if sys.version_info[:2]==(3,10) else 1)" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Fatal "Venv Python is not 3.10." "Delete backend\.venv and run setup.bat again."
}

# --- STEP 4: Backend Dependencies ---
Step-Header "Installing backend dependencies..."

& $VENV_PY -c "import fastapi, uvicorn, sqlalchemy, passlib, jwt, qrcode" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    OK "Core backend packages already installed. Skipping reinstall."
} else {
    INFO "Installing backend dependencies from requirements.txt..."
    INFO "This may take 1-2 minutes on first run..."
    
    $installOut = & $VENV_PY -m pip install -r $REQUIREMENTS 2>&1
    if ($LASTEXITCODE -ne 0) {
        $outStr = ($installOut | Out-String)
        if ($outStr -match 'psycopg2') {
            WARN "psycopg2-binary failed (PostgreSQL C-libraries not present)."
            WARN "This is normal on standard Windows machines. Medora uses SQLite in development."
            INFO "Installing remaining packages without psycopg2-binary..."
            $tempReqs = Join-Path $LOGS_DIR 'requirements_no_psycopg2.txt'
            Get-Content $REQUIREMENTS | Where-Object { $_ -notmatch 'psycopg2' } | Set-Content $tempReqs -Encoding ASCII
            $installOut2 = & $VENV_PY -m pip install -r $tempReqs 2>&1
            if ($LASTEXITCODE -ne 0) {
                ERR "pip install failed:"
                $installOut2 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
                Fatal "Backend dependency installation failed." "Run: backend\.venv\Scripts\pip install -r backend\requirements.txt"
            }
        } else {
            ERR "pip install failed:"
            $installOut | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
            Fatal "Backend dependency installation failed." "Run: backend\.venv\Scripts\pip install -r backend\requirements.txt"
        }
    }
    
    & $VENV_PY -c "import fastapi, uvicorn, sqlalchemy, passlib, jwt, qrcode" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Fatal "Core backend packages verification failed after installation." "Run: backend\.venv\Scripts\pip install fastapi uvicorn sqlalchemy passlib PyJWT qrcode[pil]"
    }
    OK "Backend dependencies installed and verified."
}

# --- STEP 5: Node.js and Frontend ---
Step-Header "Checking Node.js and frontend dependencies..."

try { $nodeVer = (& node --version 2>&1).ToString().Trim() } catch { $nodeVer = '' }
if ($nodeVer -eq '') {
    Fatal "Node.js not found on PATH." "Install Node.js v18+ from https://nodejs.org/"
}
$nodeMajor = 0
if ($nodeVer -match '^v(\d+)') { $nodeMajor = [int]$Matches[1] }
if ($nodeMajor -lt 18) {
    Fatal "Node.js v18+ required. Found: $nodeVer" "Upgrade Node.js at https://nodejs.org/"
}

try { $npmVer = (& npm --version 2>&1).ToString().Trim() } catch { $npmVer = '' }
if ($npmVer -eq '') {
    Fatal "npm not found." "Reinstall Node.js from https://nodejs.org/"
}
OK "Node.js: $nodeVer   npm: v$npmVer"

$viteBin = Join-Path $FRONTEND 'node_modules\.bin\vite.cmd'
if (Test-Path $viteBin) {
    OK "Frontend node_modules already installed."
} else {
    INFO "Installing frontend dependencies..."
    Push-Location $FRONTEND
    try {
        $lockfile = Join-Path $FRONTEND 'package-lock.json'
        if (Test-Path $lockfile) {
            INFO "package-lock.json found - running npm ci..."
            $npmOut = & npm.cmd ci 2>&1
            if ($LASTEXITCODE -ne 0) {
                WARN "npm ci failed. Falling back to npm install..."
                $npmOut = & npm.cmd install 2>&1
                if ($LASTEXITCODE -ne 0) {
                    ERR "npm install failed:"
                    $npmOut | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
                    Pop-Location
                    Fatal "Frontend dependency installation failed." "Run: cd frontend ; npm install"
                }
            }
        } else {
            $npmOut = & npm.cmd install 2>&1
            if ($LASTEXITCODE -ne 0) {
                ERR "npm install failed:"
                $npmOut | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
                Pop-Location
                Fatal "Frontend dependency installation failed." "Run: cd frontend ; npm install"
            }
        }
    } finally {
        if ((Get-Location).Path -eq $FRONTEND) { Pop-Location }
    }
    
    if (-not (Test-Path $viteBin)) {
        Fatal "vite binary not found after npm install." "Run: cd frontend ; npm install vite --save-dev"
    }
    OK "Frontend dependencies installed."
}

$pkgJson = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
if (-not $pkgJson.scripts.dev) {
    Fatal "frontend/package.json has no 'dev' script." "Add 'dev': 'vite' to scripts section."
}
OK "Frontend dev script: $($pkgJson.scripts.dev)"

# --- STEP 6: Environment and Database ---
Step-Header "Validating environment and database..."

if (Test-Path $ENV_FILE) {
    OK "backend/.env exists."
} else {
    INFO "backend/.env not found - creating..."
    if (Test-Path $ENV_EXAMPLE) {
        Copy-Item $ENV_EXAMPLE $ENV_FILE
        OK "Created backend/.env from .env.example template."
    } else {
        $envContent = @"
# Generated by Medora setup.bat
ENVIRONMENT=DEVELOPMENT
DEBUG=true
APP_NAME="Secure Emergency Medical Access System"
API_V1_STR=/api/v1
DATABASE_URL=sqlite:///./medical_system.db
SECRET_KEY=dev-insecure-secret-key-change-in-production-0123456789abcdef0123456789
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
EMERGENCY_SESSION_EXPIRE_MINUTES=15
LOCAL_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=false
CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000"
AI_PROVIDER=rule_based
AI_API_KEY=""
STORAGE_PROVIDER=local
LOCAL_STORAGE_DIR="./storage/medical_documents"
NOTIFICATION_PROVIDER=mock
RATE_LIMIT_PER_MINUTE=100
EMERGENCY_SCAN_RATE_LIMIT_PER_MINUTE=15
DEMO_PATIENT_PASSWORD=PatientDemo123!
DEMO_DOCTOR_PASSWORD=DoctorDemo123!
DEMO_ADMIN_PASSWORD=AdminSecure123!
ADMIN_INVITE_SECRET=MEDORA-ADMIN-SETUP-2026
"@
        Set-Content -Path $ENV_FILE -Value $envContent -Encoding ASCII
        OK "Created minimal development .env file."
    }
}

$requiredVars = @('DATABASE_URL','SECRET_KEY','ALGORITHM')
$envLines = Get-Content $ENV_FILE | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' }
foreach ($var in $requiredVars) {
    if ($envLines | Where-Object { $_ -match "^${var}\s*=" }) {
        OK "ENV: $var is configured."
    } else {
        WARN "ENV: $var not found in backend/.env - backend may fail to start."
    }
}

$dbPath = Join-Path $BACKEND 'medical_system.db'
if (Test-Path $dbPath) {
    $dbSize = [math]::Round((Get-Item $dbPath).Length / 1024, 1)
    OK "SQLite database exists: medical_system.db ($dbSize KB) - will be reused."
} else {
    OK "SQLite database will be created automatically on first backend startup."
}

# --- STEP 7: Editor Selection ---
Step-Header "Opening the selected editor..."

function Test-Command {
    param([string]$Cmd)
    try {
        $null = & where.exe $Cmd 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

$editorOpened = $false

if (Test-Path $EDITOR_CFG) {
    $saved = (Get-Content $EDITOR_CFG -Raw).Trim()
    if ($saved -eq 'none') {
        OK "Editor: configured to skip (saved in .medora-editor.cfg)."
        $editorOpened = $true
    } else {
        $isValid = (Test-Path $saved) -or (Test-Command $saved)
        if ($isValid) {
            INFO "Opening saved editor: $saved"
            try {
                Start-Process -FilePath $saved -ArgumentList "`"$Root`"" -ErrorAction Stop
                OK "Editor opened: $saved"
                $editorOpened = $true
            } catch {
                WARN "Saved editor failed: $saved - prompting for new selection."
                Remove-Item $EDITOR_CFG -Force -ErrorAction SilentlyContinue
            }
        } else {
            WARN "Saved editor not found: $saved - prompting for new selection."
            Remove-Item $EDITOR_CFG -Force -ErrorAction SilentlyContinue
        }
    }
}

if (-not $editorOpened) {
    Write-Host ""
    Write-Host "  Select a code editor to open the Medora project:" -ForegroundColor Cyan
    Write-Host ""
    
    $options = [System.Collections.Generic.List[hashtable]]::new()
    
    $codeExe = $null
    $codeFullPath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd"
    if (Test-Command 'code') {
        $codeExe = 'code'
    } elseif (Test-Path $codeFullPath) {
        $codeExe = $codeFullPath
    }
    if ($codeExe) {
        $options.Add(@{Label='Visual Studio Code'; Cmd=$codeExe})
    }
    
    $agyExe = $null
    if (Test-Command 'agy') {
        $agyExe = 'agy'
    } else {
        $agyCandidates = @(
            "$env:LOCALAPPDATA\Programs\Antigravity IDE\bin\antigravity-ide.cmd",
            "$env:LOCALAPPDATA\Programs\Antigravity IDE\Antigravity IDE.exe",
            "$env:LOCALAPPDATA\Programs\antigravity\Antigravity.exe",
            "$env:PROGRAMFILES\Antigravity\Antigravity.exe"
        )
        foreach ($cand in $agyCandidates) {
            if (Test-Path $cand) {
                $agyExe = $cand
                break
            }
        }
    }
    if ($agyExe) {
        $options.Add(@{Label='Antigravity IDE'; Cmd=$agyExe})
    }
    
    $options.Add(@{Label='Enter custom executable path'; Cmd='__CUSTOM__'})
    $options.Add(@{Label='Continue without opening an editor'; Cmd='__NONE__'})
    
    for ($i = 0; $i -lt $options.Count; $i++) {
        Write-Host ("  [{0}] {1}" -f ($i+1), $options[$i].Label) -ForegroundColor White
    }
    Write-Host ""
    
    $choice = $null
    while ($null -eq $choice) {
        $raw = Read-Host "  Enter choice (1-$($options.Count))"
        $n = 0
        if ([int]::TryParse($raw, [ref]$n) -and $n -ge 1 -and $n -le $options.Count) {
            $choice = $options[$n-1]
        } else {
            Write-Host "  Invalid choice. Enter a number between 1 and $($options.Count)." -ForegroundColor Yellow
        }
    }
    
    $selectedCmd = $choice.Cmd
    
    if ($selectedCmd -eq '__NONE__') {
        Set-Content $EDITOR_CFG 'none' -Encoding ASCII
        OK "Skipping editor. Choice saved."
        $editorOpened = $true
    } elseif ($selectedCmd -eq '__CUSTOM__') {
        $customPath = (Read-Host "  Enter full path to editor executable").Trim('"').Trim()
        if ($customPath -and (Test-Path $customPath)) {
            Set-Content $EDITOR_CFG $customPath -Encoding ASCII
            try {
                Start-Process -FilePath $customPath -ArgumentList "`"$Root`"" -ErrorAction Stop
                OK "Editor opened: $customPath"
            } catch {
                WARN "Could not launch: $customPath"
            }
        } else {
            WARN "Path not found or empty. Continuing without editor."
        }
        $editorOpened = $true
    } else {
        Set-Content $EDITOR_CFG $selectedCmd -Encoding ASCII
        try {
            Start-Process -FilePath $selectedCmd -ArgumentList "`"$Root`"" -ErrorAction Stop
            OK "Editor opened: $($choice.Label)"
        } catch {
            WARN "Could not open editor '$selectedCmd'. Continuing without editor."
        }
        $editorOpened = $true
    }
}

# --- PORT / READINESS HELPERS ---
function Test-PortInUse {
    param([int]$Port)
    $result = netstat -ano 2>$null | Select-String ":${Port}\s"
    return [bool]$result
}

function Test-BackendHealthy {
    param([int]$TimeoutSec=3)
    try {
        $r = Invoke-WebRequest -Uri $HEALTH_URL -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        return ($r.StatusCode -eq 200 -and $r.Content -match 'healthy')
    } catch {
        return $false
    }
}

function Test-FrontendReady {
    param([int]$TimeoutSec=3)
    try {
        $r = Invoke-WebRequest -Uri $FRONTEND_URL -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400)
    } catch {
        return $false
    }
}

# --- STEP 8: Start Backend ---
Step-Header "Starting the backend..."

$backendAlreadyUp = $false
if (Test-PortInUse $BACKEND_PORT) {
    WARN "Port $BACKEND_PORT is in use. Checking if it is a healthy Medora backend..."
    if (Test-BackendHealthy) {
        OK "Medora backend already running on port $BACKEND_PORT - reusing."
        $backendAlreadyUp = $true
    } else {
        Fatal "Port $BACKEND_PORT is occupied by another process." "Run: netstat -ano | findstr :$BACKEND_PORT to locate the PID and stop it."
    }
}

if (-not $backendAlreadyUp) {
    $backendLaunch = Join-Path $LOGS_DIR '_backend_launch.cmd'
    $backendBatchContent = @"
@echo off
title Medora Backend [:$BACKEND_PORT]
echo.
echo ============================================================
echo  Medora Backend (FastAPI + Uvicorn + SQLite)
echo ============================================================
echo  API     : $BACKEND_URL
echo  Docs    : $BACKEND_URL/docs
echo  Health  : $HEALTH_URL
echo  Metrics : $BACKEND_URL/metrics
echo ============================================================
echo.
set PYTHONPATH=$BACKEND
cd /d "$BACKEND"
"$VENV_PY" -m uvicorn app.main:app --host $BACKEND_HOST --port $BACKEND_PORT --reload
echo.
echo Backend stopped. Press any key to close this terminal...
pause >nul
"@
    Set-Content -Path $backendLaunch -Value $backendBatchContent -Encoding ASCII
    
    Start-Process -FilePath 'cmd.exe' -ArgumentList "/k `"$backendLaunch`"" -WindowStyle Normal
    OK "Backend terminal opened."
}

# --- STEP 9: Start Frontend ---
Step-Header "Starting the frontend..."

$frontendAlreadyUp = $false
if (Test-PortInUse $FRONTEND_PORT) {
    WARN "Port $FRONTEND_PORT is in use. Checking if it is the Medora frontend..."
    if (Test-FrontendReady) {
        OK "Medora frontend already running on port $FRONTEND_PORT - reusing."
        $frontendAlreadyUp = $true
    } else {
        Fatal "Port $FRONTEND_PORT is occupied by another process." "Run: netstat -ano | findstr :$FRONTEND_PORT to locate the PID and stop it."
    }
}

if (-not $frontendAlreadyUp) {
    $frontendLaunch = Join-Path $LOGS_DIR '_frontend_launch.cmd'
    $frontendBatchContent = @"
@echo off
title Medora Frontend [:$FRONTEND_PORT]
echo.
echo ============================================================
echo  Medora Frontend (React 18 + TypeScript + Vite)
echo ============================================================
echo  URL     : $FRONTEND_URL
echo  Backend : $BACKEND_URL (proxied via /api)
echo ============================================================
echo.
cd /d "$FRONTEND"
npm run dev
echo.
echo Frontend stopped. Press any key to close this terminal...
pause >nul
"@
    Set-Content -Path $frontendLaunch -Value $frontendBatchContent -Encoding ASCII
    
    Start-Process -FilePath 'cmd.exe' -ArgumentList "/k `"$frontendLaunch`"" -WindowStyle Normal
    OK "Frontend terminal opened."
}

# --- STEP 10: Readiness and Browser Launch ---
Step-Header "Waiting for services and opening Medora..."

# Wait for backend
if (-not $backendAlreadyUp) {
    INFO "Waiting for backend (up to 90s)..."
    $tries = 0
    $ready = $false
    while ($tries -lt 45 -and -not $ready) {
        $tries++
        if (Test-BackendHealthy 2) {
            OK "Backend ready! (${tries} attempts elapsed)"
            $ready = $true
        } else {
            if ($tries % 5 -eq 0) {
                INFO "Backend not ready yet (${tries} attempts)... waiting..."
            }
            Start-Sleep -Seconds 2
        }
    }
    if (-not $ready) {
        Fatal "Backend did not respond at $HEALTH_URL within 90s." "Check the 'Medora Backend' terminal window for Python errors."
    }
} else {
    OK "Backend already ready."
}

# Wait for frontend
if (-not $frontendAlreadyUp) {
    INFO "Waiting for frontend (up to 120s)..."
    $tries = 0
    $ready = $false
    while ($tries -lt 60 -and -not $ready) {
        $tries++
        if (Test-FrontendReady 2) {
            OK "Frontend ready! (${tries} attempts elapsed)"
            $ready = $true
        } else {
            if ($tries % 5 -eq 0) {
                INFO "Frontend not ready yet (${tries} attempts)... waiting..."
            }
            Start-Sleep -Seconds 2
        }
    }
    if (-not $ready) {
        Fatal "Frontend did not respond at $FRONTEND_URL within 120s." "Check the 'Medora Frontend' terminal window for Vite errors."
    }
} else {
    OK "Frontend already ready."
}

# --- ALL READY ---
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "   Medora is READY!" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Frontend  :  $FRONTEND_URL" -ForegroundColor White
Write-Host "   Backend   :  $BACKEND_URL" -ForegroundColor White
Write-Host "   API Docs  :  $BACKEND_URL/docs" -ForegroundColor White
Write-Host "   Health    :  $HEALTH_URL" -ForegroundColor White
Write-Host "   Metrics   :  $BACKEND_URL/metrics" -ForegroundColor White
Write-Host ""
Write-Host "   Demo accounts (development):" -ForegroundColor Cyan
Write-Host "     Patient : patient@example.com  /  PatientDemo123!" -ForegroundColor White
Write-Host "     Doctor  : doctor@example.com   /  DoctorDemo123!" -ForegroundColor White
Write-Host "     Admin   : admin@example.com    /  AdminSecure123!" -ForegroundColor White
Write-Host "     QR Token: demo-emergency-token-9812" -ForegroundColor White
Write-Host ""
Write-Host "   Backend + frontend terminals are open. Close them to stop servers." -ForegroundColor Yellow
Write-Host ""

Log-Message "All services ready. Opening browser: $FRONTEND_URL"

try {
    Start-Process $FRONTEND_URL
    OK "Browser opened: $FRONTEND_URL"
} catch {
    WARN "Could not open browser automatically. Navigate to: $FRONTEND_URL"
}

Write-Host ""
Write-Host "  [Done] This setup window can be closed." -ForegroundColor Green
Write-Host ""
