@echo off
TITLE Stop ASU Conference Hall Service
echo Stopping ASU Conference Hall Booking Server processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a 2>nul
)
echo Service stopped safely.
timeout /t 3
