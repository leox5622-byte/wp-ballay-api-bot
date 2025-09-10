module.exports = {
  config: {
    name: "gcinfo",
    aliases: ["groupinfo", "ginfo"],
    version: "1.0",
    author: "Rahaman Leon",
    description: "Show detailed information about the current group",
    category: "group",
    role: 0,
    guide: "{pn} — view info about the current group"
  },

  onStart: async function ({ message, client }) {
    try {
      const chat = await message.getChat();

      if (!chat.isGroup) {
        return message.reply("❌ This command only works inside group chats.");
      }

      const ownerId = chat.owner ? chat.owner.user : null;
      const participants = chat.participants || [];
      const creationTime = new Date(chat.createdAt * 1000);
      const description = chat.description || "No group description set.";

      const ownerContact = ownerId ? await client.getContactById(`${ownerId}@c.us`) : null;

      const groupInfoText = `
📌 *Group Info*:
• Name: ${chat.name}
• ID: ${chat.id._serialized}
• Owner: ${ownerContact ? `${ownerContact.pushname || ownerContact.number}` : "Unknown"}
• Members: ${participants.length}
• Created: ${creationTime.toLocaleString()}
• Description: ${description}
      `.trim();

      await message.reply(groupInfoText);
    } catch (err) {
      console.error("gcinfo error:", err);
      message.reply("⚠️ Failed to retrieve group info.");
    }
  }
};
