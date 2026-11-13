@echo off
REM ==========================================================================
REM  FWBer Launcher (v2.3.63)
REM  Starts Backend (4003), Frontend (3000), and Geo (8081) at BelowNormal CPU
REM  priority, or delegates to the Windows System Tray controller (--tray).
REM ==========================================================================
setlocal
title FWBer Launcher
cd /d "%~dp0"

echo [FWBer] Starting development environment (BelowNormal CPU priority)...
echo.

where npm >nul 2>nul
if errorlevel 1 (
    echo [FWBer ERROR] npm not found. Please install Node.js and npm first.
    pause
    exit /b 1
)

REM Delegate to Windows System Tray controller when --tray is passed
where powershell >nul 2>nul
if not errorlevel 1 (
    if /i "%1"=="--tray" (
        echo [FWBer] Launching Windows System Tray controller...
        start "FWBer Tray" /belownormal powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\fwber-tray.ps1"
        exit /b 0
    )
)

echo [FWBer] Checking backend dependencies...
pushd fwber-backend-ts
if not exist "node_modules" (
    echo [FWBer] Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo [FWBer ERROR] Backend install failed.
        popd
        pause
        exit /b 1
    )
)
echo [FWBer] Starting Backend on http://localhost:4003 (BelowNormal)...
if exist "node_modules\tsx" (
    start "FWBer Backend (4003)" /belownormal cmd /k "set PORT=4003&& npm run dev"
) else (
    start "FWBer Backend (4003)" /belownormal cmd /k "set PORT=4003&& node --watch dist/index.js"
)
popd

echo [FWBer] Checking frontend dependencies...
pushd fwber-frontend
if not exist "node_modules" (
    echo [FWBer] Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo [FWBer ERROR] Frontend install failed.
        popd
        pause
        exit /b 1
    )
)
echo [FWBer] Starting Frontend on http://localhost:3000 (BelowNormal)...
start "FWBer Frontend (3000)" /belownormal cmd /k "npm run dev"
popd

if exist "fwber-geo\target\release\fwber-geo.exe" (
    echo [FWBer] Starting Rust Geo-Screener on http://127.0.0.1:8081 (BelowNormal)...
    pushd fwber-geo
    start "FWBer Geo (8081)" /belownormal "%CD%\target\release\fwber-geo.exe"
    popd
) else (
    echo [FWBer INFO] fwber-geo release binary not built yet ^(run "build.bat geo" to enable :8081^).
)

echo.
echo =====================================================
echo [FWBer] Services launched at BelowNormal CPU priority:
echo   Backend:  http://localhost:4003/health
echo   Frontend: http://localhost:3000
echo   Geo H3:   http://127.0.0.1:8081/health
echo.
echo Tip: Run "start.bat --tray" or "tools\fwber-tray.bat"
echo      to manage & quit servers cleanly from the system tray.
echo =====================================================
echo.
echo Press any key to close this launcher window (services keep running)...
pause >nul
endlocal
