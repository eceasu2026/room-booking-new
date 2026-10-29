@echo off
TITLE ASU Conference Hall System — Windows Setup
COLOR 0A
echo ===================================================================
echo   Assam Skill University — Automated Windows 11 Host Installer
echo ===================================================================
echo.

cd /d "%~dp0\.."

echo [1/3] Checking Node.js installation...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js v20 or v22 from https://nodejs.org
    pause
    exit /b 1
)

echo [2/3] Installing application dependencies...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo [3/3] Compiling optimized Material Design 3 frontend assets...
call npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm run build failed.
    pause
    exit /b 1
)

echo.
echo ===================================================================
echo   SETUP COMPLETED SUCCESSFULLY!
echo   To launch the server, double click: start-asu-booking.bat
echo ===================================================================
pause
