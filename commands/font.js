const axios = require("axios");

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json");
  return base.data.mahmud;
};

module.exports = {
  config: {
    name: "style",
    aliases: ["font"],
    version: "1.7",
    author: "MahMUD",
    countDown: 5,
    role: 0,
    category: "general",
    shortDescription: {
      en: "Convert text into different font styles"
    },
    guide: {
      en: "style list\nstyle <number> <text>"
    }
  },

  onStart: async function ({ message, args }) {
    const apiUrl = await baseApiUrl();

    // If user wants the font list
    if (args[0]?.toLowerCase() === "list") {
      try {
        const response = await axios.get(`${apiUrl}/api/font/list`);
        const fontList = response.data?.replace("Available Font Styles:", "").trim();
        return fontList
          ? message.reply(`📑 Available Font Styles:\n${fontList}`)
          : message.reply("⚠️ No font styles found.");
      } catch (err) {
        console.error("❌ Font list fetch error:", err.message);
        return message.reply("❌ Error fetching font styles.");
      }
    }

    const [number, ...textParts] = args;
    const text = textParts.join(" ");
    if (!number || isNaN(number) || !text) {
      return message.reply("❌ Invalid format.\n✅ Use: style <number> <text>\n📄 Or: style list");
    }

    try {
      const response = await axios.post(`${apiUrl}/api/font`, { number, text });
      const fontData = response.data?.data;
      if (!fontData || !fontData[number]) {
        return message.reply("⚠️ Font style not found or API error.");
      }

      const converted = text
        .split("")
        .map(char => fontData[number][char] || char)
        .join("");

      return message.reply(converted);
    } catch (err) {
      console.error("❌ Font style conversion error:", err.message);
      return message.reply("❌ Error processing your request.");
    }
  }
};
