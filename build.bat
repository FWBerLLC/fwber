@echo off
REM ==========================================================================
REM  FWBer Unified Build Script (v2.3.61)
REM  Validates dependencies, generates Prisma client, and builds every
REM  component in the monorepo without cleaning or purging built binaries.
REM
REM  Usage: build.bat [backend|frontend|geo|mobile|all] [--install]
REM  Default target is "all". Pass --install to force npm install even when
REM  node_modules already exists.
REM ==========================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"
set TARGET=%1
if "%TARGET%"=="" set TARGET=all
if /i "%TARGET%"=="--install" (
    set TARGET=all
    set FORCE_INSTALL=1
) else (
    set FORCE_INSTALL=0
    if /i "%2"=="--install" set FORCE_INSTALL=1
)

echo ============================================
echo  FWBer Build (v2.3.61) - target: %TARGET%
echo ============================================

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm not found. Install Node.js first.
    pause
    exit /b 1
)

if /i "%TARGET%"=="backend"  goto :backend
if /i "%TARGET%"=="frontend" goto :frontend
if /i "%TARGET%"=="geo"      goto :geo
if /i "%TARGET%"=="mobile"   goto :mobile
if /i "%TARGET%"=="all"      goto :backend
echo [ERROR] Unknown target "%TARGET%". Use backend, frontend, geo, mobile, or all.
exit /b 1

:backend
echo.
echo [1/4] Backend (fwber-backend-ts)...
pushd fwber-backend-ts
if not exist "node_modules" (
    echo [FWBer] Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Backend npm install failed.
        popd
        exit /b 1
    )
) else if "%FORCE_INSTALL%"=="1" (
    echo [FWBer] Refreshing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Backend npm install failed.
        popd
        exit /b 1
    )
)
echo [FWBer] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo [WARN] Prisma client generation reported a warning - continuing build.
)
call npm run build
if errorlevel 1 (
    echo [WARN] Backend build reported errors - review output above.
)
popd
if /i "%TARGET%"=="backend" goto :done

:frontend
echo.
echo [2/4] Frontend (fwber-frontend)...
pushd fwber-frontend
if not exist "node_modules" (
    echo [FWBer] Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Frontend npm install failed.
        popd
        exit /b 1
    )
) else if "%FORCE_INSTALL%"=="1" (
    echo [FWBer] Refreshing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Frontend npm install failed.
        popd
        exit /b 1
    )
)
call npm run build
if errorlevel 1 (
    echo [WARN] Frontend build reported errors - review output above.
)
popd
if /i "%TARGET%"=="frontend" goto :done

:geo
echo.
echo [3/4] Spatial Microservice (fwber-geo)...
if exist "fwber-geo\Cargo.toml" (
    where cargo >nul 2>nul
    if errorlevel 1 (
        echo [INFO] Rust cargo not found on PATH - skipping optional fwber-geo build.
    ) else (
        pushd fwber-geo
        cargo build --release
        if errorlevel 1 (
            echo [WARN] fwber-geo cargo build reported errors - review output above.
        )
        popd
    )
)
if /i "%TARGET%"=="geo" goto :done

:mobile
echo.
echo [4/4] Mobile (mobile)...
if exist "mobile\package.json" (
    pushd mobile
    if not exist "node_modules" (
        call npm install
        if errorlevel 1 (
            echo [WARN] Mobile npm install failed - optional component.
            popd
            goto :done
        )
    ) else if "%FORCE_INSTALL%"=="1" (
        call npm install
    )
    popd
)

:done
echo.
echo ============================================
echo  Build sequence complete for target: %TARGET%
echo ============================================
endlocal
