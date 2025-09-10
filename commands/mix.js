const axios = require("axios");
const emojiRegex = require("emoji-regex");

module.exports = {
  config: {
    name: "emojimix",
    aliases: ["emojimix", "mixemoji", "mix"],
    version: "2.1.1",
    author: "RL ",
    coolDown: 5,
    role: 0,
    category: "image",
    shortDescription: "Mix two emojis to create a new emoji image",
    longDescription: "Mix two emojis using Google Emoji Kitchen to generate a fun hybrid",
    guide: "{pn} 😀 😍\n{pn} 🔥 💧\n{pn} 🐶 🐱"
  },

  langs: {
    en: {
      invalidFormat: "❌ Please use correct format: %1 <emoji1> <emoji2>",
      needTwoEmojis: "❌ You need to input exactly 2 emojis to mix",
      mixing: "🔄 Mixing emojis...",
      mixResult: "✨ Here's your mixed emoji!",
      mixFailed: "❌ Cannot mix these emojis. Try different ones!",
      apiError: "❌ Emoji Kitchen server is not reachable",
      downloadError: "❌ Failed to download the mixed emoji image"
    }
  },

  onStart: async function ({ message, args, client, prefix, getLang }) {
    if (!args.length) return message.reply(getLang("invalidFormat", `${prefix}mix`));

    const input = args.join(" ");
    const emojis = extractEmojis(input);

    if (emojis.length !== 2) return message.reply(getLang("needTwoEmojis"));

    const [emoji1, emoji2] = emojis;
    const code1 = getEmojiCode(emoji1);
    const code2 = getEmojiCode(emoji2);

    try {
      await message.reply(getLang("mixing"));
      const imageUrl = await fetchEmojiKitchenUrl(code1, code2);
      if (!imageUrl) return message.reply(getLang("mixFailed"));

      const imageBuffer = await downloadImageBuffer(imageUrl);
      if (!imageBuffer) return message.reply(getLang("downloadError"));

      await client.sendMessage(message.from, { image: imageBuffer, caption: getLang("mixResult") });
    } catch (err) {
      console.error("emojimix error:", err);
      return message.reply(getLang("apiError"));
    }
  }
};

// 🔧 Extract emojis using emoji-regex
function extractEmojis(str) {
  const regex = emojiRegex();
  return [...str.matchAll(regex)].map(m => m[0]).slice(0, 2);
}

// 🔧 Convert emoji to Google-compatible Unicode code
function getEmojiCode(emoji) {
  return Array.from(emoji)
    .map(c => c.codePointAt(0).toString(16))
    .join("-")
    .toLowerCase();
}

// 📡 Get valid Emoji Kitchen URL
async function fetchEmojiKitchenUrl(code1, code2) {
  const dates = ["20220815", "20220203", "20210218", "20201001"];
  for (const date of dates) {
    for (const [a, b] of [[code1, code2], [code2, code1]]) {
      const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/u${a}/u${a}_u${b}.png`;
      try {
        const res = await axios.head(url, { timeout: 5000 });
        if (res.status === 200) return url;
      } catch (_) { continue; }
    }
  }
  return null;
}

// 💾 Download image as Buffer (streamed)
async function downloadImageBuffer(url) {
  try {
    const res = await axios.get(url, { responseType: "stream", timeout: 10000 });
    return await streamToBuffer(res.data);
  } catch (err) {
    console.error("Download error:", err.message);
    return null;
  }
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
