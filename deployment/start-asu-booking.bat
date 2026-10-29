@echo off
TITLE ASU Conference Hall Booking System Service
COLOR 0B
echo ===================================================================
echo   ASSAM SKILL UNIVERSITY
echo   Conference Hall Booking System — Windows 11 Production Host
echo ===================================================================
echo.

cd /d "%~dp0\.."

IF NOT EXIST "node_modules" (
    echo [ERROR] Dependencies missing. Running initial setup first...
    call "%~dp0\setup-windows.bat"
)

IF NOT EXIST "dist" (
    echo [INFO] Production frontend bundle not found. Building now...
    call npm run build
)

echo [INFO] Starting ASU Central Conference Hall Server on port 3000...
echo [INFO] Open in browser: http://localhost:3000
echo [INFO] Health status:   http://localhost:3000/api/v1/health
echo.
npm run start
pause
