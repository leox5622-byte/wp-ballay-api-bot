const moment = require("moment-timezone");
const { getUserData, updateUserData, log } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "daily",
    aliases: ["dailyreward", "checkin"],
    version: "1.5",
    author: "RL + Fixed by Mahmud",
    coolDown: 5,
    role: 0,
    description: "Receive daily gift rewards",
    category: "game",
    guide: {
      en: "{prefix}daily or {prefix}daily info"
    }
  },

  rewardConfig: {
    coin: 1000,
    exp: 50
  },

  langs: {
    en: {
      alreadyReceived: "❌ You've already claimed today's reward!\n🕰️ Try again after 12:00 AM (BD time).",
      received: "🎁 *Daily Reward Claimed!*\n\n💰 Coins: +%1\n⭐ EXP: +%2\n\n💼 Total Coins: %3\n🏆 Total EXP: %4",
      rewardInfo: "📅 *Daily Reward Schedule*\n\n%1\n\n💡 Rewards increase by 20% each day!"
    }
  },

  onStart: async function ({ message, args }) {
    const userId = message.author;
    const reward = this.rewardConfig;
    const tz = "Asia/Dhaka";
    const now = moment.tz(tz);
    const today = now.format("YYYY-MM-DD");
    const dayIndex = now.isoWeekday(); // Monday=1, Sunday=7

    if (args[0] === "info") {
      let lines = "";
      for (let i = 1; i <= 7; i++) {
        const c = Math.floor(reward.coin * Math.pow(1.2, i - 1));
        const e = Math.floor(reward.exp * Math.pow(1.2, i - 1));
        lines += `📆 ${this.getDayName(i)}: ${c} coins, ${e} exp\n`;
      }
      return message.reply(this.langs.en.rewardInfo.replace("%1", lines));
    }

    let user = await getUserData(userId);

    // Ensure user object always has lastDailyReward field
    if (!user.lastDailyReward) user.lastDailyReward = null;

    if (user.lastDailyReward === today) {
      return message.reply(this.langs.en.alreadyReceived);
    }

    // Calculate today's reward with 20% daily increase based on weekday index
    const getCoin = Math.floor(reward.coin * Math.pow(1.2, dayIndex - 1));
    const getExp = Math.floor(reward.exp * Math.pow(1.2, dayIndex - 1));

    // Update user data
    const updatedUser = {
      coins: (user.coins || 0) + getCoin,
      exp: (user.exp || 0) + getExp,
      level: this.calculateLevel((user.exp || 0) + getExp),
      lastDailyReward: today, // ✅ Stored as string now
      lastActive: Date.now()
    };

    // Save updated data
    user = await updateUserData(userId, updatedUser);

    // Prepare reply message
    const msg = this.langs.en.received
      .replace("%1", getCoin)
      .replace("%2", getExp)
      .replace("%3", user.coins)
      .replace("%4", user.exp);

    await message.reply(msg);
    log(`✅ ${userId} claimed daily: +${getCoin} coins, +${getExp} exp`);
  },

  getDayName(i) {
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i - 1];
  },

  calculateLevel(exp) {
    return Math.floor(exp / 100) + 1;
  }
};
