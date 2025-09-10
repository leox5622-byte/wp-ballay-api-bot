// Author: Rahaman Leon
// Command: info
// Description: Shows system & memory info

const os = require("os");

module.exports = {
  config: {
    name: "info",
    aliases: ["sysinfo"],
    version: "1.0.1",
    author: "Rahaman Leon",
    role: 0,
    coolDown: 8,
    description: "System info",
    category: "utility",
    guide: {
      en: "Use {prefix}info to get system information"
    }
  },

  onStart: async function ({ message }) {
    try {
      const uptimeMin = Math.floor(os.uptime() / 60);
      const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
      const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2);
      const cpus = os.cpus()[0].model;

      const info = [
        "📊 *System Information*",
        "",
        `• **OS:** ${os.platform()} ${os.arch()}`,
        `• **Uptime:** ${uptimeMin} minutes`,
        `• **CPU:** ${cpus}`,
        `• **RAM:** ${freeMem} GB free / ${totalMem} GB total`,
        `• **Node.js:** ${process.version}`
      ].join('\n');
      
      await message.reply(info);
    } catch (error) {
      console.error("Info command error:", error);
      await message.reply("❌ Failed to retrieve system information.");
    }
  }
};
