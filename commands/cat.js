// Author: Rahaman Leon
// Command: cat
// Description: Sends a random cat image

const axios = require("axios");
const { MessageMedia } = require("../scripts/messageMedia");

module.exports = {
  config: {
    name: "cat",
    version: "1.0.0",
    author: "Rahaman Leon",
    coolDown: 3,
    role: 0,
    description: {
      en: "Sends a random cat image",
    },
    category: "image",
    guide: {
      en: "{prefix}cat - Get a cute cat picture",
    },
  },

  onStart: async function ({ message, client }) {
    try {
      const response = await axios.get("https://cataas.com/cat", {
        responseType: "arraybuffer",
      });

      const media = new MessageMedia(
        "image/jpeg",
        Buffer.from(response.data).toString("base64")
      );

      await client.sendMessage(message.from, media, {
        caption: "🐱 Here's a random cat for you!",
      });
    } catch (err) {
      console.error("❌ cat.js error:", err.message);
      await client.sendMessage(message.from, "❌ Couldn't fetch a cat image. Even cats need a break.");
    }
  },
};
