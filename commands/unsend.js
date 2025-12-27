module.exports = {
  config: {
    name: "unsend",
    aliases: ["u", "uns", "r"],
    version: "2.3",
    author: "Rahman Leon",
    coolDown: 5,
    role: 0,
    category: "utility"
  },

  langs: {
    en: {
      syntaxError: "❌ Reply to a bot message.",
      notBotMsg: "⚠️ This message was not sent by the bot.",
      tooOld: "⏱️ This message is too old to delete.",
      failed: "❌ Failed to delete the message."
    }
  },

  onStart: async function ({ message, client }) {
    const L = this.langs.en;

    try {
      // 1️⃣ Extract contextInfo safely (works for menus)
      const ctx =
        message?.message?.extendedTextMessage?.contextInfo ||
        message?.message?.buttonsResponseMessage?.contextInfo ||
        message?.message?.listResponseMessage?.contextInfo;

      if (!ctx || !ctx.stanzaId) {
        return message.reply(L.syntaxError);
      }

      const botJid = client.user.id;

      // 2️⃣ Ownership check (real one)
      if (ctx.participant && ctx.participant !== botJid) {
        return message.reply(L.notBotMsg);
      }

      // 3️⃣ Time limit (recent only)
      const MAX_AGE_MS = 2 * 60 * 1000;
      const msgTime = ctx.messageTimestamp
        ? ctx.messageTimestamp * 1000
        : Date.now();

      if (Date.now() - msgTime > MAX_AGE_MS) {
        return message.reply(L.tooOld);
      }

      // 4️⃣ Revoke (Baileys-correct)
      await client.sendMessage(message.from, {
        delete: {
          remoteJid: message.from,
          id: ctx.stanzaId,
          fromMe: true
        }
      });

    } catch (err) {
      console.error("UNSEND ERROR:", err);
      return message.reply(L.failed);
    }
  }
};
