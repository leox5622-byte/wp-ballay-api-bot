const axios = require('axios');

module.exports = {
  config: {
    name: "translate",
    aliases: ["trans"],
    version: "2.0",
    author: "Rahaman Leon",
    coolDown: 5,
    role: 0,
    description: {
      en: "Translate text to a target language (supports reply or inline '-> <lang>' syntax)"
    },
    category: "utility",
    guide: {
      en: [
        "{pn} <text> -> <lang>",
        "{pn} hello -> bn",
        "Reply to a message: {pn} <lang>",
        "Examples:",
        "• {pn} good morning -> vi",
        "• (reply) {pn} en"
      ].join("\n")
    }
  },

  onStart: async function({ message, args, client, prefix, config, chat, contact }) {
    try {
      const defaultLang = (config && config.bot && config.bot.defaultLang) || 'en';

      // Helper: extract text from a Baileys message content object
      const extractText = (msgContent) => {
        if (!msgContent) return '';
        return (
          msgContent.conversation ||
          msgContent.extendedTextMessage?.text ||
          msgContent.imageMessage?.caption ||
          msgContent.videoMessage?.caption ||
          ''
        );
      };

      // Gather context for replies
      const ctx = message?.message?.extendedTextMessage?.contextInfo || {};
      const quotedContent = ctx.quotedMessage || null;
      const repliedText = extractText(quotedContent).trim();

      // Build raw text input from args
      const raw = (args || []).join(' ').trim();

      // Parse "->" or "=>" patterns for inline language selection
      const parseInline = (input) => {
        if (!input) return { text: '', lang: null };
        let idx = input.lastIndexOf('->');
        if (idx === -1) idx = input.lastIndexOf('=>');
        if (idx !== -1) {
          const left = input.slice(0, idx).trim();
          const right = input.slice(idx + 2).trim();
          return { text: left, lang: right || null };
        }
        return { text: input, lang: null };
      };

      // Simple language code detector (ISO 639-1/2 2-3 letters)
      const looksLikeLang = (s) => /^[a-z]{2,3}$/i.test((s || '').trim());

      let textToTranslate = '';
      let langCode = null;

      if (repliedText) {
        // If replying to a message: content = replied text
        textToTranslate = repliedText;
        if (raw) {
          // If user provided a language alongside reply, accept either first token or inline arrow
          const { text, lang } = parseInline(raw);
          if (lang) {
            langCode = lang;
          } else if (looksLikeLang(args[0])) {
            langCode = args[0].trim();
          }
        }
      } else {
        // Not a reply: parse inline arrow or take whole raw as text
        const { text, lang } = parseInline(raw);
        textToTranslate = (text || '').trim();
        if (lang) langCode = lang;
      }

      // Fallback target language
      if (!langCode) langCode = defaultLang;

      // Validate inputs
      if (!textToTranslate) {
        const usage = [
          "❌ Please provide text to translate or reply to a message.",
          `Usage: ${prefix}${this.config.name} <text> -> <lang>` ,
          `Example: ${prefix}${this.config.name} hello -> bn`,
          `Or reply to a message: ${prefix}${this.config.name} en`
        ].join('\n');
        return await message.reply(usage);
      }

      if (!looksLikeLang(langCode)) {
        return await message.reply("❌ Invalid language code. Use a 2–3 letter ISO code like en, bn, vi.");
      }

      // Do translation via Google translate (unofficial)
      const translated = await translate(textToTranslate, langCode.trim());
      const header = `🌐 Translate from ${translated.lang || 'auto'} to ${langCode}`;
      return await message.reply(`${translated.text}\n\n${header}`);

    } catch (err) {
      console.error('translate command error:', err);
      return await message.reply('❌ Failed to translate. Please try again later.');
    }
  }
};

async function translate(text, langCode) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(langCode)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await axios.get(url);
  return {
    text: Array.isArray(res.data?.[0]) ? res.data[0].map(item => item[0]).join('') : '',
    lang: res.data?.[2] || 'auto'
  };
}