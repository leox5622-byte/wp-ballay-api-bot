const { getUserData, getGroupData, log } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "alll",
    version: "1.2",
    author: "NTKhang (Modified by Mahmud)",
    countDown: 5,
    role: 1,
    description: {
      vi: "Tag tất cả thành viên trong nhóm chat của bạn",
      en: "Tag all members in your group chat"
    },
    category: "box chat",
    guide: {
      vi: "{pn} [nội dung | để trống]",
      en: "{pn} [content | empty]"
    }
  },

  onStart: async function ({ message, event, args }) {
    try {
      const groupId = event.chatId || event.groupID || event.remoteJid;
      const senderId = event.senderID || event.from;

      // Fetch user & group data (MongoDB)
      await getUserData(senderId);
      await getGroupData(groupId);

      const content = args.join(" ") || "@all";

      const mentions = [];
      const { participantIDs } = event;

      if (!participantIDs || participantIDs.length === 0)
        return message.reply("❌ No group participants found.");

      for (const id of participantIDs) {
        mentions.push({
          tag: content,
          id
        });
      }

      await message.reply({ body: content, mentions });

    } catch (error) {
      log(`❌ Error in all.js: ${error.message}`, "error");
      await message.reply("⚠️ Failed to tag all members.");
    }
  }
};
