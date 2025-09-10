const mongoose = require("mongoose");
const MessageCount = require("../models/MessageCount");
const isDbConnected = () => mongoose.connection.readyState === 1;

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
      if (!isDbConnected()) {
        return message.reply("❌ Database is not connected. Message counts are temporarily unavailable.");
      }

      const threadID = chat?.id?._serialized || chat?.id;
      const userID = contact?.id?._serialized || contact?.id;
      const userName = contact?.pushname || contact?.name || "Unknown";

      if (!threadID || !userID) return message.reply("❌ Unable to identify user or group.");

      if (args[0]?.toLowerCase() === "all") {
        const allUsers = await MessageCount.find({ threadID }).sort({ count: -1 }).limit(50);
        if (!allUsers.length)
          return message.reply("❌ No message data found for this group.");

        let msg = "📊 Group Message Leaderboard:\n";
        allUsers.forEach((user, i) => {
          const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          msg += `\n${rank} ${user.name}: ${user.count} msg`;
        });

        return message.reply(msg);
      }

      const userData = await MessageCount.findOne({ threadID, userID });

      if (!userData)
        return message.reply("❌ No message data found for you.");

      return message.reply(`✅ ${userName}, you have sent ${userData.count} messages in this group.`);
    } catch (err) {
      console.error("❌ count command error:", err);
      return message.reply("❌ An error occurred: " + err.message);
    }
  },

  onChat: async function ({ message, chat, contact }) {
    try {
      if (!isDbConnected()) return; // Skip updates when DB offline

      const threadID = chat?.id?._serialized || chat?.id;
      const userID = contact?.id?._serialized || contact?.id;
      const userName = contact?.pushname || contact?.name || "Unknown";

      if (!threadID || !userID) return;

      const existing = await MessageCount.findOne({ threadID, userID });

      if (!existing) {
        await MessageCount.create({
          threadID,
          userID,
          name: userName,
          count: 1
        });
      } else {
        existing.count += 1;
        if (userName && userName !== existing.name)
          existing.name = userName;
        await existing.save();
      }
    } catch (err) {
      console.error("❌ Error updating message count:", err);
    }
  }
};
