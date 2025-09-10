module.exports = {
  config: {
    name: "unsend",
    aliases: ["uns", "r", "unsent", "u"],
    version: "2.0",
    author: "NTKhang (adapted for Baileys by RL)",
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
      // Extract quoted message info from Baileys context
      const ctx = message.message?.extendedTextMessage?.contextInfo;
      const stanzaId = ctx?.stanzaId || ctx?.stanzaID || ctx?.stanzaid; // handle possible variants
      const participant = ctx?.participant; // quoted sender in groups
      const remoteJid = message.from;

      if (!stanzaId) {
        return await message.reply(L.syntaxError);
      }

      // Determine if quoted message belongs to the bot (best-effort)
      const botId = client?.sock?.user?.id;
      const isQuotedFromBot = participant
        ? (participant === botId || participant?.split(':')[0] === botId?.split(':')[0])
        : true; // in 1:1 chats participant may be undefined; attempt delete with fromMe=true

      if (!isQuotedFromBot && isGroup) {
        // In groups we can reliably check participant; block early if not from bot
        return await message.reply(L.notBotMsg);
      }

      // Build delete key and attempt unsend
      const deleteKey = { remoteJid, id: stanzaId, fromMe: true };
      if (participant) deleteKey.participant = participant;

      await client.sock.sendMessage(remoteJid, { delete: deleteKey });
    } catch (err) {
      // If deletion fails, most likely it wasn't the bot's message
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("not-authorized") || msg.includes("revoke") || msg.includes("not from me")) {
        return await message.reply(this.langs.en.notBotMsg);
      }
      console.error("❌ Unsend Error:", err);
      return await message.reply(this.langs.en.failed);
    }
  }
};
