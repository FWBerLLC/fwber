@echo off
REM ==========================================================================
REM  FWBer Unified Build Script (v2.3.34)
REM  Installs dependencies and builds every component in the monorepo.
REM  Usage: build.bat [backend|frontend|mobile|all]
REM  Default target is "all". Does NOT clean or purge built binaries.
REM ==========================================================================
setlocal
cd /d "%~dp0"
set TARGET=%1
if "%TARGET%"=="" set TARGET=all

echo ============================================
echo  FWBer Build - target: %TARGET%
echo ============================================

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm not found. Install Node.js first.
    pause
    exit /b 1
)

if /i "%TARGET%"=="backend"  goto :backend
if /i "%TARGET%"=="frontend" goto :frontend
if /i "%TARGET%"=="mobile"   goto :mobile
if /i "%TARGET%"=="all"      goto :backend
echo [ERROR] Unknown target "%TARGET%". Use backend, frontend, mobile, or all.
exit /b 1

:backend
echo.
echo [1/3] Backend (fwber-backend-ts)...
pushd fwber-backend-ts
call npm install
if errorlevel 1 (
    echo [ERROR] Backend npm install failed.
    popd
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo [WARN] Backend build reported errors - review output above.
)
popd
if /i "%TARGET%"=="backend" goto :done

:frontend
echo.
echo [2/3] Frontend (fwber-frontend)...
pushd fwber-frontend
call npm install
if errorlevel 1 (
    echo [ERROR] Frontend npm install failed.
    popd
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo [WARN] Frontend build reported errors - review output above.
)
popd
if /i "%TARGET%"=="frontend" goto :done

:mobile
echo.
echo [3/3] Mobile (mobile)...
pushd mobile
call npm install
if errorlevel 1 (
    echo [WARN] Mobile npm install failed - optional component.
    popd
    goto :done
)
popd

:done
echo.
echo ============================================
echo  Build sequence complete for target: %TARGET%
echo ============================================
endlocal
