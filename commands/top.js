const { getUserData, log, getAllUsers } = require('../scripts/helpers');
// const User = require('../models/User'); // No longer needed

module.exports = {
  config: {
    name: "top",
    version: "1.7",
    author: "MahMUD",
    role: 0,
    category: "economy",
    guide: {
      en: "Use `{pn}` or `{pn} bal` to view richest users, `{pn} exp` to view top EXP users"
    }
  },

  onStart: async function({ message, args, client, prefix, config, chat, contact }) {
    try {
      const type = (args[0] || "bal").toLowerCase();

      let users;
      if (type === "exp") {
        users = await getAllUsers('exp', 15, { exp: { $gt: 0 } });
        if (!users.length) return message.reply("No users with EXP to display.");
      } else {
        users = await getAllUsers('coins', 15, { coins: { $gt: 0 } });
        if (!users.length) return message.reply("No users with money to display.");
      }

      const medals = ["🥇", "🥈", "🥉"];

      // Fetch names in parallel
      const topList = await Promise.all(users.map(async (user, i) => {
        const rank = i < 3 ? medals[i] : `${i + 1}.`;

        const userID = user.userID || user.id || "Unknown";
        const data = await getUserData(userID);
        const name = data?.name || String(userID);

        return type === "exp"
          ? `${rank} ${name}: ${formatNumber(user.exp)} EXP`
          : `${rank} ${name}: ${formatNumber(user.coins)}$`;
      }));

      const title = type === "exp"
        ? "👑 TOP 15 EXP USERS:"
        : "👑 | Top 15 Richest Users:";

      return message.reply(`${title}\n\n${topList.join("\n")}`);

    } catch (error) {
      log(`Top command error: ${error.message}`, "error");
      return message.reply("❌ An error occurred while fetching leaderboard.");
    }
  }
};

function formatNumber(num) {
  const units = ["", "K", "M", "B", "T", "Q", "Qi", "Sx", "Sp", "Oc", "N", "D"];
  let unit = 0;
  while (num >= 1000 && unit < units.length - 1) {
    num /= 1000;
    unit++;
  }
  return Number(num.toFixed(1)) + units[unit];
}
