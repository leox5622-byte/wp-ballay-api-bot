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
    const totalSeconds = process.uptime();

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
    await message.reply(`⏳ Bot Uptime: ${uptimeStr}`);
  }
};
