module.exports = {
  config: {
    name: "unsend",
    aliases: ["u", "uns", "r", "unsent"],
    version: "2.1",
    author: "Rahman Leon",
    coolDown: 5,
    role: 0,
    category: "utility",
    description: {
      en: "Delete bot's own message"
    },
    guide: {
      en: "Reply to a bot message and use {pn}"
    }
  },

  langs: {
    en: {
      syntaxError: "❌ Reply to a bot message.",
      notBotMsg: "⚠️ This message was not sent by the bot.",
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

      // Bot JID (Baileys MD)
      const botJid = client.user.id;

      // REAL ownership check (NOT fromMe)
      if (quoted.sender !== botJid) {
        return message.reply(L.notBotMsg);
      }

      // Required revoke payload
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
