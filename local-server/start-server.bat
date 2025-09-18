@echo off
setlocal enabledelayedexpansion
echo.
echo ================================
echo  Chrome Notion Plugin Server
echo ================================
echo.
echo Starting Node.js server...
echo.
echo Server will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Check if server.js exists
if not exist "server.js" (
    echo ERROR: server.js not found in current directory
    echo Make sure you're running this from the local-server folder
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    npm install
    echo.
)

REM Kill any existing server on port 3000
echo Checking for existing processes on port 3000...
echo.

REM Find and kill processes using port 3000
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo Found existing server process on port 3000
    echo Terminating existing processes...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        echo - Killing PID: %%a
        taskkill /PID %%a /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo   Process %%a terminated successfully
        ) else (
            echo   Warning: Could not terminate process %%a
        )
    )
    echo.
    echo Waiting for port to be released...
    timeout /t 2 /nobreak >nul 2>&1
    echo Port 3000 is now available
) else (
    echo Port 3000 is already available
)
echo.

REM Start the server
echo ================================
echo Starting Chrome Notion Plugin Server...
echo ================================
echo.
node server.js

REM Keep window open if server stops unexpectedly
echo.
echo ================================
echo Server stopped
echo ================================
pause
