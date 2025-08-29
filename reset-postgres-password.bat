@echo off
echo Stopping PostgreSQL service...
net stop postgresql-x64-17

echo.
echo Starting PostgreSQL in single-user mode to reset password...
echo This will allow us to set a new password for the postgres user.
echo.

cd /d "C:\Program Files\PostgreSQL\17\bin"

echo Setting new password to 'password'...
echo ALTER USER postgres PASSWORD 'password'; | postgres --single -D "C:\Program Files\PostgreSQL\17\data" sports_management

echo.
echo Starting PostgreSQL service...
net start postgresql-x64-17

echo.
echo PostgreSQL password has been reset to: password
echo You can now connect with: psql -U postgres -d postgres
pause