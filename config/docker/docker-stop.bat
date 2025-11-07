@echo off
REM Docker Development Environment Shutdown Script for Windows

echo Stopping Sports Manager Docker Environment...
echo.

REM Stop all services
docker-compose down

echo.
echo All services stopped!
echo.
echo Additional options:
echo    Remove volumes (database data): docker-compose down -v
echo    Remove images: docker-compose down --rmi all
echo    Clean everything: docker-compose down -v --rmi all
echo.
pause