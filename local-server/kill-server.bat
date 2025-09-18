@echo off
setlocal enabledelayedexpansion
echo.
echo ================================
echo  Kill Chrome Notion Plugin Server
echo ================================
echo.

echo Searching for processes using port 3000...
echo.

REM Find and kill all processes using port 3000
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo Found processes using port 3000:
    netstat -ano | findstr :3000
    echo.
    echo Terminating processes...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo - Killing PID: %%a
        taskkill /PID %%a /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo   ✓ Process %%a terminated successfully
        ) else (
            echo   ✗ Warning: Could not terminate process %%a
        )
    )
    echo.
    echo ✓ All processes on port 3000 have been terminated
) else (
    echo ✓ No processes found using port 3000
)

echo.
echo ================================
echo Done
echo ================================
pause
