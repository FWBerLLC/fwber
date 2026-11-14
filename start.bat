@echo off
REM ==========================================================================
REM  FWBer Launcher (Dynamic VERSION from repo root)
REM  Starts Backend (4003), Frontend (3000), and Geo (8081) at BelowNormal CPU
REM  priority, or delegates to the Windows System Tray controller (--tray).
REM ==========================================================================
setlocal
cd /d "%~dp0"

set "FWBER_VER=unknown"
if exist "VERSION" set /p FWBER_VER=<VERSION
title FWBer Launcher (v%FWBER_VER%)

echo [FWBer v%FWBER_VER%] Starting development environment (BelowNormal CPU priority)...
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
        call "%~dp0tray.bat"
        exit /b %ERRORLEVEL%
    )
)

echo [FWBer] Checking backend dependencies...
pushd fwber-backend-ts
if not exist "node_modules" (
    echo [FWBer] Installing backend dependencies...
    start "" /b /wait /belownormal cmd /c "npm install --no-fund --no-audit"
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
    start "" /b /wait /belownormal cmd /c "npm install --no-fund --no-audit"
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
echo [FWBer v%FWBER_VER%] Services launched at BelowNormal CPU priority:
echo   Backend:  http://localhost:4003/health
echo   Frontend: http://localhost:3000
echo   Geo H3:   http://127.0.0.1:8081/health
echo.
echo Tip: Run "tray.bat" (or "start.bat --tray" / "tools\fwber-tray.bat")
echo      to manage & quit servers cleanly from the system tray.
echo =====================================================
echo.
echo Press any key to close this launcher window (services keep running)...
pause >nul
endlocal
