module.exports = {
  config: {
    name: "kick",
    aliases: ["remove"],
    version: "1.0.2",
    author: "@anbuinfosec",
    countDown: 10,
    role: 1,
    description: "Kick a user from the group",
    category: "moderation",
    guide: "{pn} @user [reason] - Kick a user from the group"
  },
  
  onStart: async function ({ message, args, client, config, chat, contact }) {
    try {
      const threadId = chat?.id?._serialized || message?.from;
      const isGroup = message?.isGroup || (threadId && threadId.endsWith('@g.us'));
      if (!isGroup) {
        return message.reply("❌ This command can only be used in groups.");
      }

      // Determine target user: prefer mentions, then quoted author
      let targetId = null;
      const mentioned = Array.isArray(message.mentionedIds) ? message.mentionedIds : [];
      if (mentioned.length > 0) {
        targetId = mentioned[0];
      } else if (message.hasQuotedMsg) {
        const quoted = await message.getQuotedMessage();
        targetId = quoted?.author || quoted?.from || null;
      }

      if (!targetId) {
        return message.reply("❌ Please mention or reply to the user you want to kick.\nUsage: .kick @user [reason]");
      }

      // Normalize target id to @s.whatsapp.net format if needed
      if (!/@(s|c)\.whatsapp\.net$/.test(targetId)) {
        const num = String(targetId).replace(/\D/g, '');
        targetId = num ? `${num}@s.whatsapp.net` : targetId;
      }

      // Reason: everything after the first arg (mention or number)
      const reason = args.slice(1).join(" ") || "No reason provided";

      try {
        // Ensure we have direct access to Baileys sock via compat
        if (!client || !client.sock || typeof client.sock.groupParticipantsUpdate !== 'function') {
          return message.reply("❌ Group management is not available right now. Try again later.");
        }

        await client.sock.groupParticipantsUpdate(threadId, [targetId], 'remove');

        const simpleName = targetId.split("@")[0];
        const kickedBy = contact?.id?._serialized?.split("@")[0] || "Admin";
        const kickMessage = `👢 User Kicked\n\n👤 User: ${simpleName}\n🆔 ID: ${targetId}\n👮 By: ${kickedBy}\n📝 Reason: ${reason}\n🕐 Time: ${new Date().toLocaleString()}`;
        await message.reply(kickMessage);
      } catch (error) {
        await message.reply("❌ Failed to kick user. Make sure the bot has admin permissions.");
      }
      
    } catch (error) {
      await message.reply("❌ An error occurred while processing the kick command.");
    }
  }
};
