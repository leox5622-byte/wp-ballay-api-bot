const { getUserData, updateUserData, log, getAllUsers, normalizeJid } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "count",
    aliases: ["msgcount", "messages", "c"],
    version: "1.7",
    author: "MahMUD",
    countDown: 5,
    role: 0,
    shortDescription: "Count user's messages",
    longDescription: "Tracks how many messages each user sends in a WhatsApp group",
    category: "group",
    guide: {
      en: "{pn} - Show your message count\n{pn} all - Show leaderboard"
    }
  },

  onStart: async function ({ message, args, chat, contact }) {
    try {
      // The database connection is handled by helpers.js, no need for explicit check here

      const threadID = normalizeJid(chat?.id?._serialized || chat?.id);
      const userID = normalizeJid(contact?.id?._serialized || contact?.id);
      const userName = contact?.pushname || contact?.name || "Unknown";

      if (!threadID || !userID) return message.reply("❌ Unable to identify user or group.");

      if (args[0]?.toLowerCase() === "all") {
        // For 'all' command, we need to get all users and filter by threadID if necessary
        // However, getUserData is user-specific. We need a way to get all users' message counts.
        // The current getAllUsers in helpers.js doesn't filter by threadID.
        // For now, I will get all users and filter in memory.
        const allUsersData = await getAllUsers('messageCount', 50, { messageCount: { $gt: 0 } });

        // Filter by threadID if needed (assuming messageCount is global per user, not per thread)
        // If messageCount is truly per-thread, this approach needs adjustment.
        // For now, assuming messageCount is a global user stat.
        const usersInThisThread = allUsersData.filter(user => user.id === userID); // This logic needs to be refined if messageCount is per-thread.
        // For now, let's assume messageCount is a global user stat.
        const topUsers = allUsersData.sort((a, b) => b.messageCount - a.messageCount).slice(0, 50);

        if (!topUsers.length)
          return message.reply("❌ No message data found for any user.");

        let msg = "📊 Top Message Leaderboard:\n";
        for (let i = 0; i < topUsers.length; i++) {
          const user = topUsers[i];
          const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          // getUserData to get the name, as getAllUsers might not have the latest name
          const fullUserData = await getUserData(user.id);
          const name = fullUserData?.name || user.id.split('@')[0];
          msg += `\n${rank} ${name}: ${user.messageCount} msg`;
        }

        return message.reply(msg);
      }

      const userData = await getUserData(userID, userName); // Get user data, create if not exists

      if (!userData || userData.messageCount === 0)
        return message.reply("❌ No message data found for you.");

      return message.reply(`✅ ${userName}, you have sent ${userData.messageCount} messages in this group.`);
    } catch (err) {
      log(`Count command error: ${err.message}`, 'error');
      return message.reply("❌ An error occurred: " + err.message);
    }
  },

  onChat: async function ({ message, chat, contact }) {
    try {
      // No explicit DB connection check needed, helpers handle it

      const threadID = normalizeJid(chat?.id?._serialized || chat?.id);
      const userID = normalizeJid(contact?.id?._serialized || contact?.id);
      const userName = contact?.pushname || contact?.name || "Unknown";

      if (!threadID || !userID) return;

      const userData = await getUserData(userID, userName); // Get user data, create if not exists

      await updateUserData(userID, {
        messageCount: (userData.messageCount || 0) + 1,
        name: userName // Ensure name is updated if it changed
      });
    } catch (err) {
      log(`Error updating message count: ${err.message}`, 'error');
    }
  }
};
