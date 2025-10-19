@echo off
REM Quick Development Startup Script for Windows

echo ========================================
echo Sports Manager - Development Startup
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker is not running!
    echo.
    echo Please start Docker Desktop, then run this script again.
    echo.
    echo Alternatively, you can:
    echo   1. Start Cerbos manually: npm run start:cerbos
    echo   2. Or skip Cerbos: set SKIP_CERBOS=true
    echo.

    set /p CONTINUE="Continue without Cerbos? (y/N): "
    if /i not "%CONTINUE%"=="y" (
        pause
        exit /b 1
    )

    echo.
    echo Starting backend and frontend only...
    start "Backend Server" cmd /k "cd backend && npm run dev"
    timeout /t 3 /nobreak >nul
    start "Frontend Server" cmd /k "cd frontend && npm run dev"

) else (
    echo [OK] Docker is running
    echo.

    REM Check if concurrently is installed
    if not exist "node_modules\concurrently" (
        echo Installing dependencies...
        npm install
        echo.
    )

    echo Starting all services...
    npm run dev
)

echo.
echo ========================================
echo Services should be starting:
echo   - Cerbos:    http://localhost:3592
echo   - Backend:   http://localhost:3001
echo   - Frontend:  http://localhost:3000
echo ========================================
echo.
echo Press Ctrl+C to stop all services
echo.
