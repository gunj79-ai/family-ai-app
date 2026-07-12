@echo off
title FamilyAI
color 0A
echo.
echo  ╔═══════════════════════════════════╗
echo  ║         FamilyAI Server           ║
echo  ╚═══════════════════════════════════╝
echo.

:: Kill any existing processes on port 3001
for /f "tokens=5" %%a in (
  'netstat -ano ^| findstr :3001 ^| findstr LISTENING 2^>nul'
) do taskkill /PID %%a /F >nul 2>&1

:: Build frontend first (production mode)
echo [1/3] Building frontend...
cd /d "%~dp0frontend"
call npm run build >nul 2>&1
if errorlevel 1 (
  echo [!] Frontend build failed. Run manually: cd frontend ^&^& npm run build
  pause & exit /b 1
)
echo [1/3] Frontend built.

:: Start backend in production mode
echo [2/3] Starting backend...
cd /d "%~dp0backend"
set NODE_ENV=production
start "FamilyAI Backend" /min cmd /c "npx tsx src/index.ts >> ..\data\backend.log 2>&1"

:: Wait for backend to be ready (up to 15 seconds)
set /a count=0
:WAIT_LOOP
timeout /t 1 /nobreak >nul
curl -s http://localhost:3001/api/health >nul 2>&1
if not errorlevel 1 goto BACKEND_READY
set /a count+=1
if %count% lss 15 goto WAIT_LOOP
echo [!] Backend failed to start. Check data\backend.log
pause & exit /b 1

:BACKEND_READY
echo [2/3] Backend ready on port 3001.

:: Ensure Tailscale serve is active
echo [3/3] Checking Tailscale HTTPS...
tailscale serve status >nul 2>&1
if errorlevel 1 (
  echo [!] Tailscale not running or serve not configured.
  echo     Run once: tailscale serve https / http://localhost:3001
) else (
  echo [3/3] HTTPS available via Tailscale.
)

:: Get Tailscale hostname
for /f "tokens=*" %%a in ('tailscale status --self 2^>nul ^| findstr ts.net') do (
  echo.
  echo  ┌──────────────────────────────────────────────┐
  echo  │  Local:  http://localhost:3001               │
  echo  │  Remote: https://%%a  │
  echo  └──────────────────────────────────────────────┘
)
echo.
echo  Press any key to stop FamilyAI...
pause >nul

taskkill /F /FI "WindowTitle eq FamilyAI Backend" >nul 2>&1
echo.
echo  FamilyAI stopped.
