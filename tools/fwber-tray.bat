@echo off
REM ==========================================================================
REM  Launch the FWBer Windows System Tray Controller (v2.3.63)
REM  Starts Backend (4003), Frontend (3000), and Geo (8081) at BelowNormal CPU
REM  priority under a Windows Notification Area icon that can inspect logs and
REM  stop/quit all spawned child servers cleanly.
REM ==========================================================================
setlocal
cd /d "%~dp0\.."

where powershell >nul 2>nul
if errorlevel 1 (
    echo [FWBer] Windows PowerShell not found.
    pause
    exit /b 1
)

echo [FWBer] Launching system tray controller (BelowNormal priority)...
start "FWBer Tray" /belownormal powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0fwber-tray.ps1" %*
endlocal
