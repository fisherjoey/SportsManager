@echo off
echo Complete PostgreSQL Removal Script
echo ===================================
echo.
echo This script will completely remove PostgreSQL.
echo Make sure to run as Administrator!
echo.

echo 1. Stopping PostgreSQL service...
net stop postgresql-x64-17 2>nul
sc delete postgresql-x64-17 2>nul

echo 2. Removing installation directories...
rmdir /s /q "C:\Program Files\PostgreSQL" 2>nul
rmdir /s /q "C:\PostgreSQL" 2>nul

echo 3. Removing user data directories...
rmdir /s /q "C:\Users\%USERNAME%\AppData\Roaming\postgresql" 2>nul
rmdir /s /q "C:\Users\%USERNAME%\AppData\Local\PostgreSQL" 2>nul
rmdir /s /q "C:\ProgramData\PostgreSQL" 2>nul

echo 4. Removing registry entries...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\PostgreSQL" /f 2>nul
reg delete "HKEY_CURRENT_USER\SOFTWARE\PostgreSQL" /f 2>nul

echo 5. Removing from PATH environment variable...
echo (You may need to manually check System Environment Variables)

echo.
echo PostgreSQL removal complete!
echo You can now do a fresh installation.
echo.
pause