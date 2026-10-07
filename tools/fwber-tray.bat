@echo off
REM ==========================================================================
REM  Launch the FWBer system tray controller (v2.3.34)
REM  Starts backend (4003) + frontend (3000) under a tray icon that can
REM  stop/quit them cleanly. Requires Windows PowerShell 5.1+.
REM ==========================================================================
setlocal
cd /d "%~dp0\.."

where powershell >nul 2>nul
if errorlevel 1 (
    echo [FWBer] Windows PowerShell not found.
    pause
    exit /b 1
)

echo [FWBer] Launching system tray...
start "FWBer Tray" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fwber-tray.ps1"
endlocal
