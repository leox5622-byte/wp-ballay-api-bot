module.exports = {
  config: {
    name: "unsend",
    aliases: ["u", "uns", "r"],
    version: "2.1",
    author: "Rahman Leon",
    cooldown: 5,
    role: 0,
    category: "utility",
    description: {
      en: "Unsend bot message"
    },
    guide: {
      en: "Reply to a bot message and use {pn}"
    }
  },

  langs: {
    en: {
      syntaxError: "Please reply to a bot message.",
      notBotMsg: "That message was not sent by the bot.",
      failed: "Failed to unsend the message."
    }
  },

  onStart: async function ({ message, client }) {
    const L = this.langs.en;

    try {
      const ctx = message.message?.extendedTextMessage?.contextInfo;
      if (!ctx?.stanzaId || !ctx?.participant) {
        return client.sock.sendMessage(
          message.key.remoteJid,
          { text: L.syntaxError }
        );
      }

      const botJid = client.sock.user.id;
      const quotedSender = ctx.participant;

      // ✅ REAL bot-message check
      if (quotedSender !== botJid) {
        return client.sock.sendMessage(
          message.key.remoteJid,
          { text: L.notBotMsg }
        );
      }

      await client.sock.sendMessage(message.key.remoteJid, {
        delete: {
          remoteJid: message.key.remoteJid,
          fromMe: true,
          id: ctx.stanzaId,
          participant: quotedSender
        }
      });

    } catch (err) {
      console.error("Unsend Error:", err);
      return client.sock.sendMessage(
        message.key.remoteJid,
        { text: L.failed }
      );
    }
  }
};
