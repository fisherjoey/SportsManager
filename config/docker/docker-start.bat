@echo off
REM Docker Development Environment Startup Script for Windows

echo Starting Sports Manager Docker Environment...
echo.

REM Get the script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%\..\..
cd /d "%PROJECT_ROOT%"

REM Check if .env file exists, if not copy from example
if not exist .env (
    echo Creating .env file from .env.docker...
    if exist config\docker\.env.docker (
        copy config\docker\.env.docker .env
    ) else if exist .env.example (
        copy .env.example .env
    ) else (
        echo Warning: No .env template found, creating basic .env...
        echo DB_USER=postgres> .env
        echo DB_PASSWORD=postgres123>> .env
        echo DB_NAME=sports_management>> .env
        echo JWT_SECRET=your-secret-key-here>> .env
        echo NODE_ENV=development>> .env
    )
)

REM Build and start services
echo Building Docker images...
docker-compose -f config\docker\docker-compose.yml build

echo.
echo Starting services...
docker-compose -f config\docker\docker-compose.yml up -d

REM Wait for services to be ready
echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak > nul

REM Check service health
echo.
echo Checking service health...
docker-compose -f config\docker\docker-compose.yml ps

REM Show logs
echo.
echo ========================================
echo Service URLs:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:3001
echo    PostgreSQL: localhost:5432
echo    Redis: localhost:6379
echo    Cerbos: http://localhost:3593
echo ========================================
echo.
echo Docker environment is ready!
echo.
echo Useful commands:
echo    View logs: docker-compose -f config\docker\docker-compose.yml logs -f [service]
echo    Stop all: docker-compose -f config\docker\docker-compose.yml down
echo    Reset database: docker-compose -f config\docker\docker-compose.yml down -v
echo    Shell into container: docker-compose -f config\docker\docker-compose.yml exec [service] sh
echo.
pause