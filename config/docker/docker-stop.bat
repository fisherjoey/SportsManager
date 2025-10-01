@echo off
REM Docker Development Environment Shutdown Script for Windows

echo Stopping Sports Manager Docker Environment...
echo.

REM Get the script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%\..\..
cd /d "%PROJECT_ROOT%"

REM Stop all services
docker-compose -f config\docker\docker-compose.yml down

echo.
echo All services stopped!
echo.
echo Additional options:
echo    Remove volumes (database data): docker-compose -f config\docker\docker-compose.yml down -v
echo    Remove images: docker-compose -f config\docker\docker-compose.yml down --rmi all
echo    Clean everything: docker-compose -f config\docker\docker-compose.yml down -v --rmi all
echo.
pause