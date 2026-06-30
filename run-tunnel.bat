@echo off
title Snack Management System - Cloudflare Tunnel Startup
echo.
echo  =============================================================
echo   SNACK MANAGEMENT SYSTEM - Starting Up with Cloudflare Tunnel
echo  =============================================================
echo.

REM -------------------------------------------------------
REM Step 0: Check if cloudflared is installed
REM -------------------------------------------------------
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] 'cloudflared' command was not found in your PATH.
    echo.
    echo To use Cloudflare Tunnel, please download and install cloudflared:
    echo https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    echo.
    echo Make sure it is added to your environment variables PATH.
    echo.
    choice /M "Do you want to continue launching the services anyway?"
    if errorlevel 2 exit /b 1
)

REM -------------------------------------------------------
REM Step 1: Kill any processes already using ports 8080/5173
REM -------------------------------------------------------
echo [1/6] Releasing ports 8080 and 5173...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo    Done.

REM -------------------------------------------------------
REM Step 2: Start PostgreSQL container (handles both cases:
REM         container exists but stopped, or first run)
REM -------------------------------------------------------
echo.
echo [2/6] Starting PostgreSQL database container...
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
REM Step 3: Wait until PostgreSQL is actually accepting connections
REM -------------------------------------------------------
echo.
echo [3/6] Waiting for PostgreSQL to be ready...
:waitloop
docker exec snack-postgres pg_isready -U snackadmin -d snackdb >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 2 /nobreak >nul
    goto waitloop
)
echo    PostgreSQL is ready!

REM -------------------------------------------------------
REM Step 4: Reset the database schema for a clean slate
REM -------------------------------------------------------
echo.
echo [4/6] Resetting database schema (clean migration from scratch)...
docker exec -i snack-postgres psql -U snackadmin -d snackdb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO snackadmin; GRANT ALL ON SCHEMA public TO public;" >nul 2>&1
echo    Schema reset complete.

REM -------------------------------------------------------
REM Step 5: Launch Backend + Frontend in separate windows
REM -------------------------------------------------------
echo.
echo [5/6] Launching Backend and Frontend...
echo.

start "Snack Backend" cmd /k "cd /d "%~dp0backend" && echo Starting Spring Boot backend... && .\mvnw.cmd spring-boot:run"

REM Wait 15 seconds for backend to start before launching frontend
echo    Waiting 15 seconds for backend to initialize...
timeout /t 15 /nobreak >nul

start "Snack Frontend" cmd /k "cd /d "%~dp0frontend" && echo Installing dependencies... && npm install && echo Starting frontend dev server... && npm run dev"

REM Wait 8 seconds for Vite dev server to start
echo    Waiting 8 seconds for frontend to initialize...
timeout /t 8 /nobreak >nul

REM -------------------------------------------------------
REM Step 6: Start Cloudflare Tunnel
REM -------------------------------------------------------
echo.
echo [6/6] Launching Cloudflare Tunnel...
echo.
echo  =============================================================
echo   Your local Vite server uses self-signed HTTPS (basicSsl).
echo   We are starting a Cloudflare Tunnel pointing to https://localhost:5173.
echo   Using '--no-tls-verify' to bypass self-signed certificate checks.
echo   
echo   The API calls are automatically proxied via Vite to backend.
echo   DO NOT close this window.
echo  =============================================================
echo.

cloudflared tunnel --url https://localhost:5173 --no-tls-verify

pause
