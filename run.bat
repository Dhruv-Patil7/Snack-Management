@echo off
title Snack Management System - Startup
echo.
echo  ============================================
echo   SNACK MANAGEMENT SYSTEM - Starting Up...
echo  ============================================
echo.

REM -------------------------------------------------------
REM Step 0: Kill any processes already using ports 8080/5173
REM -------------------------------------------------------
echo [1/5] Releasing ports 8080 and 5173...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo    Done.

REM -------------------------------------------------------
REM Step 1: Start PostgreSQL container (handles both cases:
REM         container exists but stopped, or first run)
REM -------------------------------------------------------
echo.
echo [2/5] Starting PostgreSQL database container...
docker start snack-postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo    Container not found. Creating it via docker-compose...
    docker-compose up postgres -d
    if %errorlevel% neq 0 (
        echo.
        echo  ERROR: Could not start PostgreSQL.
        echo  Make sure Docker Desktop is running and try again.
        echo.
        pause
        exit /b 1
    )
) else (
    echo    Container started successfully.
)

REM -------------------------------------------------------
REM Step 2: Wait until PostgreSQL is actually accepting connections
REM -------------------------------------------------------
echo.
echo [3/5] Waiting for PostgreSQL to be ready...
:waitloop
docker exec snack-postgres pg_isready -U snackadmin -d snackdb >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 2 /nobreak >nul
    goto waitloop
)
echo    PostgreSQL is ready!

REM -------------------------------------------------------
REM Step 3: Reset the database schema for a clean slate
REM -------------------------------------------------------
echo.
echo [4/5] Resetting database schema (clean migration from scratch)...
docker exec -i snack-postgres psql -U snackadmin -d snackdb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO snackadmin; GRANT ALL ON SCHEMA public TO public;" >nul 2>&1
echo    Schema reset complete.

REM -------------------------------------------------------
REM Step 4: Launch Backend + Frontend in separate windows
REM -------------------------------------------------------
echo.
echo [5/5] Launching Backend and Frontend...
echo.

start "Snack Backend" cmd /k "cd /d "%~dp0backend" && echo Starting Spring Boot backend... && .\mvnw.cmd spring-boot:run"

REM Wait 15 seconds for backend to start before launching frontend
echo    Waiting 15 seconds for backend to initialize...
timeout /t 15 /nobreak >nul

start "Snack Frontend" cmd /k "cd /d "%~dp0frontend" && echo Installing dependencies... && npm install && echo Starting frontend dev server... && npm run dev"

REM -------------------------------------------------------
REM Done
REM -------------------------------------------------------
echo.
echo  ============================================
echo   All services started!
echo  ============================================
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8080
echo.
echo   Distributor accounts (password: distributor123):
echo     distributor / dist_tpp / dist_ei / dist_ccr
echo.
echo   Admin account: admin / admin123
echo.
echo   Leave this window open. Close it to stop everything.
echo.
pause
