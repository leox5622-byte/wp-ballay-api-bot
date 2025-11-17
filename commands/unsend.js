module.exports = {
  config: {
    name: "unsend",
    aliases: ["uns", "r", "unsent", "u"],
    version: "2.0",
    author: "RL)",
    coolDown: 5,
    role: 0,
    category: "utility",
    description: {
      en: "Unsend bot's message"
    },
    guide: {
      en: "Reply to the bot's message and use {pn}"
    }
  },

  langs: {
    en: {
      syntaxError: "❌ Please reply to a bot message you want to unsend.",
      notBotMsg: "⚠️ That message was not sent by the bot.",
      failed: "❌ Failed to unsend the message."
    }
  },

  onStart: async function ({ message, client, isGroup }) {
    const L = this.langs.en; // Fallback to English

    try {
      if (!message.hasQuotedMsg) {
        return await message.reply(L.syntaxError);
      }

      const quotedMsg = await message.getQuotedMessage();

      if (!quotedMsg || !quotedMsg.fromMe) {
        return await message.reply(L.notBotMsg);
      }

      const stanzaId = quotedMsg.id._serialized; // Use the serialized ID of the quoted message
      const remoteJid = message.from; // The chat where the unsend command was issued

      // Build delete key
      const deleteKey = { remoteJid, id: stanzaId, fromMe: true };
      // If it's a group, the participant field might be needed for the delete key
      // The quoted message's sender (the bot) is the participant for the delete operation
      if (isGroup && client?.sock?.user?.id) {
        deleteKey.participant = client.sock.user.id;
      }

      await client.sock.sendMessage(remoteJid, { delete: deleteKey });
    } catch (err) {
      // If deletion fails, most likely it wasn't the bot's message or other error
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("not-authorized") || msg.includes("revoke") || msg.includes("not from me")) {
        return await message.reply(this.langs.en.notBotMsg);
      }
      console.error("❌ Unsend Error:", err);
      return await message.reply(this.langs.en.failed);
    }
  }
};
