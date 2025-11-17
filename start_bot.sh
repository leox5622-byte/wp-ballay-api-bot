#!/bin/bash

# WhatsApp Bot Startup Script for Linux/Mac

echo "WhatsApp Bot Startup Script"
echo "============================"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "Failed to install PM2. Please install it manually: npm install -g pm2"
        exit 1
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop any existing instance
echo "Stopping any existing bot instance..."
pm2 delete whatsapp-bot &> /dev/null

# Start the bot with PM2
echo "Starting WhatsApp Bot with PM2..."
pm2 start ecosystem.config.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Bot started successfully!"
    echo ""
    echo "Useful commands:"
    echo "  pm2 list              - Show running processes"
    echo "  pm2 logs whatsapp-bot - Show bot logs"
    echo "  pm2 restart whatsapp-bot - Restart the bot"
    echo "  pm2 stop whatsapp-bot - Stop the bot"
    echo ""
    echo "Opening logs in 3 seconds..."
    sleep 3
    pm2 logs whatsapp-bot
else
    echo "❌ Failed to start the bot with PM2"
    echo "Trying to start directly..."
    node index.js
fi
