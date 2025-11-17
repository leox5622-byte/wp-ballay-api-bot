const os = require("os");

module.exports = {
  config: {
    name: "uptime",
    version: "1.0",
    author: "Rahaman Leon",
    role: 0,
    description: {
      en: "Show how long the bot has been running"
    },
    category: "Utility",
    guide: {
      en: "{pn} — display bot uptime"
    }
  },

  onStart: async function ({ message }) {
    try {
      const totalSeconds = process.uptime();
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);
      const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
      await message.reply(`⏳ Bot Uptime: ${uptimeStr}`);
    } catch (error) {
      console.error(`Error in ${this.config.name}:`, error);
      await message.reply('❌ An error occurred while executing this command.');
    }
  },
};
