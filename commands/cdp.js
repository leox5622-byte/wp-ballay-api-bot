const axios = require("axios");
const { MessageMedia } = require('../scripts/messageMedia');

module.exports = {
  config: {
    name: "cdp",
    version: "1.7",
    author: "MahMUD | Fixed by Rahaman Leon",
    countDown: 5,
    role: 0,
    category: "image",
    guide: "{pn} - Get a random Couple DP\n{pn} list - Show total number of Couple DPs"
  },

  onStart: async function ({ message, args }) {
    try {
      if (args[0] === "list") {
        const res = await axios.get("https://mahmud-global-apis.onrender.com/api/cdp/list", {
          timeout: 5000
        });
        const { total } = res.data;
        return message.reply(`🎀 Total Couple DPs: ${total}`);
      }

      const res = await axios.get("https://mahmud-global-apis.onrender.com/api/cdp", {
        timeout: 7000
      });
      const { boy, girl } = res.data;

      if (!boy || !girl) return message.reply("⚠ No Couple DP found.");

      const getMedia = async (url) => {
        try {
          const response = await axios.get(url, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent": "Mozilla/5.0",
              "Accept": "image/*,*/*;q=0.8"
            },
            timeout: 7000
          });

          const buffer = Buffer.from(response.data, "binary");
          const mimeType = response.headers["content-type"] || "image/jpeg";

          return new MessageMedia(mimeType, buffer.toString('base64'), 'image.jpg');
        } catch (err) {
          console.error(`[CDP Fetch Error] Failed to load: ${url}\n`, err.message);
          // Fallback to a transparent placeholder image
          const fallbackURL = "https://picsum.photos/300/300";
          const fallback = await axios.get(fallbackURL, { responseType: "arraybuffer" });
          return new MessageMedia("image/jpeg", Buffer.from(fallback.data).toString('base64'), "image.jpg");
        }
      };

      const mediaBoy = await getMedia(boy);
      const mediaGirl = await getMedia(girl);

      await message.reply("🎀 Here's your couple DP, lovebirds! (Boy's DP)");
      await message.reply(mediaBoy);
      await message.reply("👫 Girl's DP:");
      await message.reply(mediaGirl);

    } catch (error) {
      console.error("[CDP Command Error]", error.message);
      return message.reply("❌ Failed to process your request. Try again later.");
    }
  }
};
