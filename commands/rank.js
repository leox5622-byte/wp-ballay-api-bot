
const { getUserData, log } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "rank",
    aliases: ["level"],
    version: "1.7",
    author: "MahMUD",
    coolDown: 3,
    role: 0,
    description: "Check your current rank and XP",
    category: "info",
    guide: {
      en: "{prefix}rank - Check your rank\n{prefix}rank @user - Check someone else's rank\n{prefix}rank top - View top 10 leaderboard"
    }
  },

  onStart: async function ({ message, client, args, contact }) {
    try {
      const User = require('../models/User');

      if (args[0]?.toLowerCase() === 'top') {
        return await this.showLeaderboard(message, client);
      }

      let targetUserId = contact.id._serialized;
      let targetName = contact.name || contact.pushname || "You";

      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        targetUserId = quotedMsg.author || quotedMsg.from;
        try {
          const targetContact = await client.getContactById(targetUserId);
          targetName = targetContact.name || targetContact.pushname || targetUserId.split('@')[0];
        } catch {
          targetName = targetUserId.split('@')[0];
        }
      } else {
        const mentionedIds = message.mentionedIds || [];
        if (mentionedIds.length > 0) {
          targetUserId = mentionedIds[0];
          try {
            const targetContact = await client.getContactById(targetUserId);
            targetName = targetContact.name || targetContact.pushname || targetUserId.split('@')[0];
          } catch {
            targetName = targetUserId.split('@')[0];
          }
        }
      }

      const allUsers = await User.find().sort({ exp: -1 });
      const targetUser = await getUserData(targetUserId);
      const rank = allUsers.findIndex(u => u.id === targetUserId) + 1;

      const xpForCurrent = this.getXPForLevel(targetUser.level);
      const xpForNext = this.getXPForLevel(targetUser.level + 1);
      const progress = Math.max(0, targetUser.exp - xpForCurrent);
      const needed = Math.max(0, xpForNext - targetUser.exp);
      const totalGap = xpForNext - xpForCurrent || 1;

      const percent = Math.max(0, Math.min(progress / totalGap, 1));
      const filled = Math.floor(percent * 10);
      const bar = '░'.repeat(10).split('').fill('█', 0, filled).join('');

      const isOwn = targetUserId === contact.id._serialized;
      const displayName = isOwn ? ">🎀 𝐁𝐚𝐛𝐲, 𝐲𝐨𝐮𝐫 𝐫𝐚𝐧𝐤" : `>🎀 ${targetName}, 𝐫𝐚𝐧𝐤`;

      const msg = `
> ${displayName}
━━━━━━━━━━━━━━━━━━━━━
• 𝐑𝐚𝐧𝐤: #${rank} of ${allUsers.length}
• 𝐋𝐞𝐯𝐞𝐥: ${targetUser.level}
• 𝐄𝐱𝐩: ${targetUser.exp.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━
📊 𝐏𝐫𝐨𝐠𝐫𝐞𝐬𝐬 𝐭𝐨 𝐋𝐞𝐯𝐞𝐥: ${targetUser.level + 1}
${bar} ${Math.round(percent * 100)}%
⚡ 𝐄𝐱𝐩 𝐍𝐞𝐞𝐝𝐞𝐝: ${needed.toLocaleString()} 𝐄𝐱𝐩
      `.trim();

      await message.reply(msg);

    } catch (err) {
      log(`Rank error: ${err.message}`, 'error');
      await message.reply("❌ Error fetching rank info.");
    }
  },

  async showLeaderboard(message, client) {
    const User = require('../models/User');
    try {
      const top = await User.find().sort({ exp: -1 }).limit(10);
      if (!top.length) return await message.reply("📊 No users on the leaderboard yet!");

      let text = "🏆 Top 10 Leaderboard\n━━━━━━━━━━━━━━━━━━━━━\n";

      for (let i = 0; i < top.length; i++) {
        const u = top[i];
        let name = u.id.split('@')[0];
        try {
          const c = await client.getContactById(u.id);
          name = c.name || c.pushname || name;
        } catch {}
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        text += `${medal} ${name}\n   Level ${u.level} • ${u.exp.toLocaleString()} XP\n\n`;
      }

      text += "💡 Keep chatting to rank up!";
      await message.reply(text);
    } catch (err) {
      log(`Leaderboard error: ${err.message}`, 'error');
      await message.reply("❌ Failed to load leaderboard.");
    }
  },

  getXPForLevel(level) {
    return Math.floor(Math.pow(level, 2) * 50);
  },

  formatTimeAgo(ms) {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return `${s}s ago`;
  }
};
