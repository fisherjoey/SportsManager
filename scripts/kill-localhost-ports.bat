@echo off
echo Killing processes on localhost ports 3000-3010...

for /L %%i in (3000,1,3010) do (
    echo Checking port %%i...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr :%%i') do (
        if not "%%p"=="0" (
            echo Killing process %%p on port %%i
            taskkill /PID %%p /F >nul 2>&1
        )
    )
)

echo Done!
pause