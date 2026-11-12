@echo off
REM ==========================================================================
REM  FWBer Launcher (v2.3.61)
REM  Supports direct terminal startup or GUI System Tray mode (--tray).
REM  Managed ports: Backend (4003), Frontend (3000), optional Geo (8081).
REM ==========================================================================
setlocal
title FWBer
cd /d "%~dp0"

echo [FWBer] Starting development environment...
echo.

where npm >nul 2>nul
if errorlevel 1 (
    echo [FWBer ERROR] npm not found. Please install Node.js and npm first.
    pause
    exit /b 1
)

REM Offer system tray startup option if powershell is available
where powershell >nul 2>nul
if not errorlevel 1 (
    if "%1"=="--tray" (
        echo [FWBer] Launching in System Tray controller mode...
        start "FWBer Tray" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\fwber-tray.ps1"
        exit /b 0
    )
)

echo [FWBer] Checking backend dependencies...
cd fwber-backend-ts
if not exist "node_modules" (
    echo [FWBer] Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo [FWBer ERROR] Backend install failed.
        pause
        exit /b 1
    )
)

echo [FWBer] Starting backend (port 4003)...
start "FWBer Backend" cmd /k "npm run dev"

echo [FWBer] Checking frontend dependencies...
cd ..\fwber-frontend
if not exist "node_modules" (
    echo [FWBer] Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo [FWBer ERROR] Frontend install failed.
        pause
        exit /b 1
    )
)

echo [FWBer] Starting frontend (port 3000)...
start "FWBer Frontend" cmd /k "npm run dev"

cd ..
echo.
echo =====================================================
echo [FWBer] Both services starting:
echo   Backend:  http://localhost:4003
echo   Frontend: http://localhost:3000
echo.
echo Tip: Run "start.bat --tray" or tools\fwber-tray.bat
echo      to manage servers with the Windows notification tray icon.
echo =====================================================
echo.
echo Press any key to close this launcher (services will keep running)...
pause >nul
endlocal
