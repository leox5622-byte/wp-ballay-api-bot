module.exports = {
  config: {
    name: "uid",
    version: "1.4",
    author: "RL",
    role: 0,
    description: {
      en: "Show your WhatsApp user ID (JID)"
    },
    category: "info",
    guide: {
      en: "{pn} — get your WhatsApp user ID.\n{pn} @tag — get tagged user's ID.\nReply to a message to get that user's ID."
    },
    coolDown: 3
  },

  onStart: async function({ message, args, chat, contact }) {
    try {
      const ctx = message?.message?.extendedTextMessage?.contextInfo || {};
      const quoted = ctx.participant || null;
      const mentions = ctx.mentionedJid || [];

      const normalizeToUserJid = (input) => {
        if (!input) return null;
        let j = String(input).trim();
        // If already a JID with domain
        if (j.includes('@')) {
          const [local] = j.split('@');
          if (!local) return null;
          return `${local}@s.whatsapp.net`;
        }
        // Build from number (optionally with :device)
        const parts = j.split(':');
        const num = (parts[0] || '').replace(/\D/g, '');
        const dev = (parts[1] || '').replace(/\D/g, '');
        if (!num) return null;
        return `${num}${dev ? ':' + dev : ''}@s.whatsapp.net`;
      };

      let targets = [];

      // Priority: replied user > mentioned users > provided numbers > self
      if (quoted) {
        targets = [quoted];
      } else if (mentions.length) {
        targets = mentions;
      } else if (args && args.length) {
        targets = args
          .map(a => normalizeToUserJid(a))
          .filter(Boolean);
      } else {
        targets = [contact?.id?._serialized || message.sender];
      }

      // Normalize all to s.whatsapp.net and de-duplicate
      const jids = [...new Set(targets.map(t => normalizeToUserJid(t)).filter(Boolean))];

      if (!jids.length) {
        await message.reply('❌ Could not determine user. Reply to a message, tag a user, or provide a number.');
        return;
      }

      // Respond with one JID per line, e.g. 8801831292448:52@s.whatsapp.net
      await message.reply(jids.join('\n'));
    } catch (err) {
      await message.reply('❌ Failed to retrieve user ID. Please try again later.');
    }
  }
};