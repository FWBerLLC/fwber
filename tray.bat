@echo off
REM ==========================================================================
REM  FWBer Root System Tray Launcher
REM  Reads centralized VERSION dynamically and launches tools\fwber-tray.ps1
REM  at BelowNormal CPU priority.
REM
REM  Usage:
REM    tray.bat               -> Launch GUI tray & start local stack
REM    tray.bat -Idle         -> Launch GUI tray in Hetzner-monitor idle mode
REM    tray.bat -Status       -> Print local port & HTTP health report
REM    tray.bat -CheckProd    -> Verify live production (fwber.online) health
REM    tray.bat -StopAll      -> Stop all managed local servers cleanly
REM    tray.bat -SmokeTest    -> Run automated start -> verify -> quit cycle
REM ==========================================================================
setlocal
cd /d "%~dp0"

set "FWBER_VER=unknown"
if exist "VERSION" set /p FWBER_VER=<VERSION

where powershell >nul 2>nul
if errorlevel 1 (
    echo [FWBer v%FWBER_VER%] ERROR: Windows PowerShell not found on PATH.
    pause
    exit /b 1
)

REM Run CLI inspection/control flags synchronously in current console
for %%A in (%*) do (
    if /i "%%~A"=="-Status"    goto :cli_sync
    if /i "%%~A"=="-StopAll"   goto :cli_sync
    if /i "%%~A"=="-SmokeTest" goto :cli_sync
    if /i "%%~A"=="-CheckProd" goto :cli_sync
)

echo [FWBer v%FWBER_VER%] Launching Windows System Tray controller (BelowNormal CPU priority)...
start "FWBer Tray" /belownormal powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\fwber-tray.ps1" %*
exit /b 0

:cli_sync
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\fwber-tray.ps1" %*
exit /b %ERRORLEVEL%
