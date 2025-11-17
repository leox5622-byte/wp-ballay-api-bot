# WhatsApp Bot Startup & Restart Guide

## The Problem
Your bot is exiting when restart command is used because you're not using a process manager. The restart command does `process.exit(1)` expecting a process manager to automatically restart it.

## Solution Options

### Option 1: Use PM2 (Recommended)
PM2 is a process manager that will automatically restart your bot when it crashes or exits.

#### Install PM2 globally:
```bash
npm install -g pm2
```

#### Start the bot with PM2:
```bash
pm2 start ecosystem.config.js
```

#### Useful PM2 commands:
```bash
pm2 list              # Show all running processes
pm2 logs whatsapp-bot # Show bot logs
pm2 restart whatsapp-bot # Restart the bot
pm2 stop whatsapp-bot    # Stop the bot
pm2 delete whatsapp-bot  # Remove from PM2
pm2 monit               # Monitor resource usage
```

### Option 2: Modify Restart Command (Quick Fix)
If you prefer to run with `node index.js`, modify the restart command:

```javascript
// In commands/restart.js, replace the onStart function with:
onStart: async function({ message, client }) {
  try {
    await message.reply("🔄 Bot will restart shortly. Please restart it manually using 'node index.js'");
    log("Bot restart requested. Manual restart required.", 'warning');
    
    // Graceful shutdown instead of hard exit
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  } catch (err) {
    log(`Restart command error: ${err.message}`, 'error');
    await message.reply("❌ An error occurred while trying to restart the bot.");
  }
}
```

### Option 3: Use nodemon for Development
For development, you can use nodemon which will restart on file changes:

```bash
npm install -g nodemon
nodemon index.js
```

## Immediate Fix Steps

### Step 1: Stop any running instances
```bash
# If using PM2:
pm2 delete whatsapp-bot

# If running directly, press Ctrl+C
```

### Step 2: Start with PM2 (Recommended)
```bash
pm2 start ecosystem.config.js
```

### Step 3: Verify it's running
```bash
pm2 list
```

## Logs Location
Your PM2 configuration saves logs to:
- Error logs: `./logs/err.log`
- Output logs: `./logs/out.log`
- Combined logs: `./logs/combined.log`

## Auto-start on System Boot
To make the bot start automatically when your system boots:

```bash
pm2 startup
pm2 save
```

## Troubleshooting

### If PM2 won't start:
1. Check if port 3001 (dashboard) is available
2. Check the logs: `pm2 logs whatsapp-bot`
3. Try starting manually first: `node index.js`

### If restart command still doesn't work:
1. Check PM2 is running: `pm2 list`
2. Check bot logs for errors
3. Try manual PM2 restart: `pm2 restart whatsapp-bot`

Choose Option 1 (PM2) for the best experience!
