@echo off
REM Docker Development Environment Startup Script for Windows

echo Starting Sports Manager Docker Environment...
echo.

REM Check if .env file exists, if not copy from example
if not exist .env (
    echo Creating .env file from .env.docker...
    copy .env.docker .env
)

REM Build and start services
echo Building Docker images...
docker-compose build

echo.
echo Starting services...
docker-compose up -d

REM Wait for services to be ready
echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak > nul

REM Check service health
echo.
echo Checking service health...
docker-compose ps

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
echo    View logs: docker-compose logs -f [service]
echo    Stop all: docker-compose down
echo    Reset database: docker-compose down -v ^&^& docker-compose up -d
echo    Shell into container: docker-compose exec [service] sh
echo.
pause