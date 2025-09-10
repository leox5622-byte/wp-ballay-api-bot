const { getUserData, updateUserData } = require('../scripts/helpers');

function getSenderId(message) {
  if (!message) return null;
  if (message.from.endsWith('@g.us')) {
    return message.author || null;
  }
  return message.from || null;
}

module.exports = {
  config: {
    name: "slot",
    version: "1.7",
    author: "MahMUD",
    countDown: 10,
    role: 0,
    description: "Play slot machine to win or lose coins.",
    category: "economy",
    guide: {
      en: "Usage: !slot <amount>"
    }
  },

  onStart: async function ({ message, args }) {
    const senderID = getSenderId(message);
    if (!senderID) return message.reply("❌ Cannot determine your ID.");

    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      return message.reply("❌ Please enter a valid bet amount.\nExample: !slot 100");
    }

    try {
      const userData = await getUserData(senderID);
      if (!userData) return message.reply("❌ User data not found.");

      if (userData.coins < bet) {
        return message.reply(`❌ You don't have enough coins.\nBalance: ${userData.coins}`);
      }

      const symbols = ["❤", "💜", "💙", "💚", "💛", "🖤", "🤍", "🤎"];
      const result = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ];

      let reward = 0;
      if (result[0] === result[1] && result[1] === result[2]) {
        reward = bet * 10;
      } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
        reward = bet * 2;
      } else {
        reward = -bet;
      }

      const updatedCoins = userData.coins + reward;
      await updateUserData(senderID, { coins: updatedCoins });

      const display = `>🎀\n• 𝐁𝐚𝐛𝐲, 𝐘𝐨𝐮 ${reward > 0 ? "𝐰𝐨𝐧" : "𝐥𝐨𝐬𝐭"} $${Math.abs(reward)}\n• 𝐆𝐚𝐦𝐞 𝐑𝐞𝐬𝐮𝐥𝐭𝐬 [ ${result.join(" | ")} ]`;
      return message.reply(display);
    } catch (err) {
      console.error("Slot error:", err);
      return message.reply("❌ Something went wrong.");
    }
  }
};
