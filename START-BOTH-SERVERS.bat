@echo off
REM FamilyAI Development Server Launcher
REM Starts both backend and frontend automatically

setlocal enabledelayedexpansion

cls
echo.
echo ================================
echo   FamilyAI Development Launcher
echo ================================
echo.

REM Kill any existing Node processes on ports 3001 and 5173
echo [1/4] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 "') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 "') do taskkill /PID %%a /F 2>nul
timeout /t 2 /nobreak >nul

REM Start backend server in new window
echo [2/4] Starting backend server (port 3001)...
start "FamilyAI Backend" cmd /k "cd backend && npx tsx src/index.ts"
timeout /t 3 /nobreak >nul

REM Start frontend dev server in new window
echo [3/4] Starting frontend dev server (port 5173)...
start "FamilyAI Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo [4/4] ✓ Both servers starting...
echo.
echo ================================
echo   SERVERS READY!
echo ================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Keep this window open. Two new windows have been created:
echo   - "FamilyAI Backend" (port 3001)
echo   - "FamilyAI Frontend" (port 5173)
echo.
echo Do NOT close those windows while working.
echo.
timeout /t 5

REM Keep main window open
:loop
echo Type 'quit' and press Enter to close all servers and exit.
set /p input=">> "
if /i "%input%"=="quit" goto :cleanup
goto loop

:cleanup
echo.
echo Stopping servers...
taskkill /FI "WINDOWTITLE eq FamilyAI*" /T /F 2>nul
taskkill /IM node.exe /F 2>nul
taskkill /IM tsx.exe /F 2>nul
echo All servers stopped.
timeout /t 2
exit /b
