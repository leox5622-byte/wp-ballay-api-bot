const { getUserData } = require("../scripts/helpers");

module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "wallet", "money", "cash"],
    version: "1.4",
    author: "RL",
    countDown: 5,
    role: 0,
    description: "Check your balance or a mentioned user's.",
    category: "economy",
    guide: {
      en: "{prefix}bal or {prefix}bal @mention"
    }
  },

  langs: {
    en: {
      money: "𝐁𝐚𝐛𝐲, 𝐘𝐨𝐮𝐫 𝐛𝐚𝐥𝐚𝐧𝐜𝐞: %1",
      moneyOf: "💰 %1 has %2 coins"
    }
  },

  onStart: async function ({ message, getLang, client }) {
    const mentionIds = message.mentionedIds || [];

    if (mentionIds.length) {
      const results = await Promise.all(mentionIds.map(async id => {
        const data = await getUserData(id);
        const coins = data?.coins || 0;
        let name = id.split("@")[0];

        try {
          const c = await client.getContactById(id);
          name = c.name || c.pushname || name;
        } catch {}

        return getLang("moneyOf").replace("%1", name).replace("%2", coins);
      }));

      return message.reply(results.join("\n"));
    }

    const uid = message.author;
    const data = await getUserData(uid);
    const coins = data?.coins || 0;
    return message.reply(getLang("money").replace("%1", coins));
  }
};
