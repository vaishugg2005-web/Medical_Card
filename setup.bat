@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================================
::  MEDORA EMQ-HS -- One-Click Setup and Development Launcher
::  Zero-Trust AI-Powered Emergency Medical History Access System
::  Smart India Hackathon 2026
:: ============================================================

title Medora EMQ-HS -- One-Click Setup and Launcher

:: Resolve absolute project root from batch file location (handles spaces, strips trailing slash)
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

cd /d "%ROOT%"

echo.
echo ============================================================
echo  MEDORA EMQ-HS -- Full-Stack Medical Access System
echo  One-Click Setup and Development Launcher
echo ============================================================
echo.
echo  Project Root : "%ROOT%"
echo.

:: Verify Windows PowerShell is available
where powershell.exe >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Windows PowerShell is required but was not found on PATH.
    echo Please ensure powershell.exe is accessible.
    echo.
    pause
    exit /b 1
)

:: Verify setup.ps1 exists
set "SETUP_PS1=%ROOT%\scripts\setup.ps1"
if not exist "%SETUP_PS1%" (
    echo [ERROR] Setup script not found at:
    echo         "%SETUP_PS1%"
    echo.
    echo Please make sure the scripts\setup.ps1 file is present in the Medora project.
    echo.
    pause
    exit /b 1
)

:: Execute setup.ps1 with ExecutionPolicy Bypass to allow local execution
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SETUP_PS1%" -Root "%ROOT%"
set "PS_EXIT=%ERRORLEVEL%"

if %PS_EXIT% neq 0 (
    echo.
    echo ============================================================
    echo  MEDORA SETUP FAILED with exit code %PS_EXIT%
    echo  Review the diagnostic messages above.
    echo  Detailed execution log: "%ROOT%\logs\setup.log"
    echo ============================================================
    echo.
    pause
    exit /b %PS_EXIT%
)

echo.
echo  Medora setup process completed successfully.
echo  Terminals for Backend and Frontend remain open.
echo.
pause
exit /b 0
