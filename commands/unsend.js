module.exports = {
  config: {
    name: "unsend",
    aliases: ["u", "uns", "r"],
    version: "2.2",
    author: "Rahman Leon",
    coolDown: 5,
    role: 0,
    category: "utility",
    description: {
      en: "Delete bot's recent message only"
    },
    guide: {
      en: "Reply to a recent bot message and use {pn}"
    }
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
      if (!message.quoted) {
        return message.reply(L.syntaxError);
      }

      const quoted = message.quoted;
      const botJid = client.user.id;

      // Ownership check (Baileys-correct)
      if (quoted.sender !== botJid) {
        return message.reply(L.notBotMsg);
      }

      // Time window: 2 minutes (safe & reliable)
      const MAX_AGE_MS = 2 * 60 * 1000;
      const msgTime = quoted.messageTimestamp * 1000;
      const now = Date.now();

      if (now - msgTime > MAX_AGE_MS) {
        return message.reply(L.tooOld);
      }

      // Revoke
      await client.sendMessage(message.from, {
        delete: {
          remoteJid: message.from,
          id: quoted.id,
          fromMe: true
        }
      });

    } catch (err) {
      console.error("UNSEND ERROR:", err);
      return message.reply(L.failed);
    }
  }
};
