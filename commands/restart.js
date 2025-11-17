const { log } = require('../scripts/helpers');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "restart",
    version: "1.3.0",
    author: "Roo | Enhanced by Assistant",
    coolDown: 5,
    role: 2, // Admin role only
    description: {
      en: "Restarts the bot with improved process management.",
    },
    category: "system",
    guide: {
      en: "{prefix}restart - Restarts the bot (works with PM2 or direct node execution).",
    },
  },

  onStart: async function({ message, client, contact }) {
    try {
      const userId = contact?.id?._serialized || 'unknown';
      log(`Restart requested by user: ${userId}`, 'warning');
      
      // Save restart notification info
      const restartInfo = {
        chatId: message.from,
        userId: userId,
        timestamp: Date.now(),
        username: contact?.name || contact?.pushname || 'Admin'
      };
      
      const restartPath = path.join(__dirname, '..', 'tmp', 'restart.txt');
      await fs.promises.mkdir(path.dirname(restartPath), { recursive: true });
      await fs.promises.writeFile(restartPath, JSON.stringify(restartInfo, null, 2));
      
      // Notify user
      await message.reply("🔄 Bot is restarting...");
      
      log("Bot is restarting...", 'warning');
      
      // Restart logic
      if (process.env.PM2_HOME || process.env.pm_id !== undefined) {
        log("Detected PM2 environment - performing graceful restart", 'info');
        setTimeout(() => {
          process.exit(0);
        }, 2000);
      } else {
        log("Direct node execution detected - manual restart required", 'warning');
        setTimeout(() => {
          process.exit(1);
        }, 2000);
      }
      
    } catch (err) {
      log(`Restart command error: ${err.message}`, 'error');
      await message.reply("❌ An error occurred while trying to restart the bot.");
    }
  },

  // Function to check and send restart notification when bot starts
  checkRestart: async function(client) {
    try {
      const restartPath = path.join(__dirname, '..', 'tmp', 'restart.txt');
      
      if (fs.existsSync(restartPath)) {
        const restartInfo = JSON.parse(fs.readFileSync(restartPath, 'utf8'));
        const timeTaken = Math.round((Date.now() - restartInfo.timestamp) / 1000);

        // Stale check (ignore old restarts >5m)
        if (Date.now() - restartInfo.timestamp > 300000) {
          fs.unlinkSync(restartPath);
          return;
        }

        // Send restart completion message
        if (client && client.sendMessage) {
          await client.sendMessage(restartInfo.chatId, {
            text: `✅ Bot has successfully restarted!\n⏱️ Restart completed in ${timeTaken} seconds.`
          });
        }
        
        log(`Restart completed in ${timeTaken} seconds for user ${restartInfo.username}`, 'success');
        
        // Clean up
        fs.unlinkSync(restartPath);
      }
    } catch (error) {
      log(`Error in restart check: ${error.message}`, 'warning');
    }
  }
};
