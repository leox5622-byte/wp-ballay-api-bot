@echo off
echo WhatsApp Bot Startup Script
echo ============================

:: Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 is not installed. Installing PM2...
    npm install -g pm2
    if %errorlevel% neq 0 (
        echo Failed to install PM2. Please install it manually: npm install -g pm2
        pause
        exit /b 1
    )
)

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Stop any existing instance
echo Stopping any existing bot instance...
pm2 delete whatsapp-bot >nul 2>&1

:: Start the bot with PM2
echo Starting WhatsApp Bot with PM2...
pm2 start ecosystem.config.js

if %errorlevel% equ 0 (
    echo.
    echo ✅ Bot started successfully!
    echo.
    echo Useful commands:
    echo   pm2 list              - Show running processes
    echo   pm2 logs whatsapp-bot - Show bot logs
    echo   pm2 restart whatsapp-bot - Restart the bot
    echo   pm2 stop whatsapp-bot - Stop the bot
    echo.
    echo Opening logs in 3 seconds...
    timeout /t 3 /nobreak >nul
    pm2 logs whatsapp-bot
) else (
    echo ❌ Failed to start the bot with PM2
    echo Trying to start directly...
    node index.js
)

pause
