@echo off
REM ==========================================================================
REM  Launch the FWBer Windows System Tray Controller (delegates to root tray.bat)
REM ==========================================================================
call "%~dp0..\tray.bat" %*
exit /b %ERRORLEVEL%
