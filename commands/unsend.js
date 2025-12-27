module.exports = {
  config: {
    name: "unsend",
    aliases: ["uns", "r", "u"],
    version: "2.0",
    author: "Rahman Leon",
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
      syntaxError: "Please reply to a bot message you want to unsend.",
      notBotMsg: "That message was not sent by the bot.",
      failed: "Failed to unsend the message."
    }
  },

  onStart: async function ({ message, client }) {
    const L = this.langs.en;

    try {
      const quotedInfo = message.message?.extendedTextMessage?.contextInfo;

      if (!quotedInfo || !quotedInfo.quotedMessage) {
        return await client.sock.sendMessage(message.key.remoteJid, { text: L.syntaxError });
      }

      const quotedKey = quotedInfo.stanzaId;
      const quotedFromMe = !!quotedInfo.fromMe; // true if bot sent the message

      if (!quotedFromMe) {
        return await client.sock.sendMessage(message.key.remoteJid, { text: L.notBotMsg });
      }

      // Prepare delete operation using Baileys standard
      await client.sock.sendMessage(message.key.remoteJid, {
        delete: {
          ...quotedInfo,
          id: quotedKey,
          remoteJid: message.key.remoteJid,
          fromMe: true
        }
      });

    } catch (err) {
      console.error("Unsend Error:", err);
      return await client.sock.sendMessage(message.key.remoteJid, { text: L.failed });
    }
  }
};
