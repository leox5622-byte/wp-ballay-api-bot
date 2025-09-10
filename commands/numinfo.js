const axios = require("axios");
const { MessageMedia } = require("../scripts/messageMedia");

const dipto = "https://www.noobs-api.rf.gd/dipto";

module.exports = {
  config: {
    name: "numinfo",
    author: "Dipto",
    version: "1.0.0",
    role: 0,
    category: "utility",
    description: "Get information about a phone number",
    commandCategory: "Information",
    guide: "numinfo <number>",
  },

  onStart: async function({ client, message, args }) {
    if (!args[0]) {
      await client.sendMessage(message.from, "⚠️ Please provide a phone number.");
      return;
    }

    // Format number
    const number = args[0].startsWith("01") ? "88" + args[0] : args[0];

    // React with hourglass emoji to indicate processing
    try {
      await client.sendMessage(message.from, "⌛ Fetching info...");

      const { data } = await axios.get(`${dipto}/numinfo?number=${encodeURIComponent(number)}`);

      if (!data.info || !Array.isArray(data.info) || data.info.length === 0) {
        await client.sendMessage(message.from, "❌ No info found for this number.");
        return;
      }

      // Compose info text
      const infoText = data.info
        .map(i => `Name: ${i.name}\nType: ${i.type || "Not found"}`)
        .join("\n\n");

      // Prepare message to send
      if (data.image) {
        // Fetch image as buffer for whatsapp media message
        const imageResponse = await axios.get(data.image, { responseType: "arraybuffer" });
        const media = new MessageMedia("image/jpeg", Buffer.from(imageResponse.data, "binary").toString("base64"));
        await client.sendMessage(message.from, media, { caption: infoText });
      } else {
        await client.sendMessage(message.from, infoText);
      }

    } catch (error) {
      await client.sendMessage(message.from, `❌ Error: ${error.message}`);
      console.error("numinfo command error:", error);
    }
  }
};
