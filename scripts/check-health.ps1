#Requires -Version 5.1
<#
.SYNOPSIS
    Medora EMQ-HS - Health and Readiness Checker
.DESCRIPTION
    Polls the backend and frontend health endpoints and outputs status details.
#>

[CmdletBinding()]
param(
    [string]$BackendUrl  = "http://127.0.0.1:8000",
    [string]$FrontendUrl = "http://localhost:5173"
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " MEDORA - Services Health Status" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Backend
$healthUrl = "$BackendUrl/health"
Write-Host "[Backend] Checking: $healthUrl" -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($resp.StatusCode -eq 200 -and $resp.Content -match 'healthy') {
        Write-Host "  OK   Backend is HEALTHY (HTTP 200)" -ForegroundColor Green
        Write-Host "       Response: $($resp.Content.Trim())" -ForegroundColor Gray
    } else {
        Write-Host "  WARN Backend returned HTTP $($resp.StatusCode)" -ForegroundColor Magenta
    }
} catch {
    Write-Host "  FAIL Backend is not responding at $healthUrl" -ForegroundColor Red
}

# Check Frontend
Write-Host "`n[Frontend] Checking: $FrontendUrl" -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
        Write-Host "  OK   Frontend is READY (HTTP $($resp.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "  WARN Frontend returned HTTP $($resp.StatusCode)" -ForegroundColor Magenta
    }
} catch {
    Write-Host "  FAIL Frontend is not responding at $FrontendUrl" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
