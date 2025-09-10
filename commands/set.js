const { getUserData, updateUserData, log } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "set",
    aliases: [],
    version: "1.2",
    author: "Rahaman Leon",
    coolDown: 5,
    role: 1, // Admin only
    description: "Set coins or money for a user (mention or yourself)",
    category: "economy",
    guide: {
      en: "{prefix}set [-m|-c] <amount> [@user] – Set money or coins for mentioned user or yourself if no mention"
    }
  },

  onStart: async function ({ message, args }) {
    try {
      const senderId = message.author || message.from;
      const mentions = message.mentionedIds || [];

      // Determine target user: mentioned user if any, else sender
      const targetId = mentions.length > 0 ? mentions[0] : senderId;

      // Prevent setting own money/coins if you want; 
      // but here we allow admin to set their own as well:
      // if you want to block, uncomment below:
      // if (targetId === senderId) {
      //   return await message.reply("❌ You cannot set your own coins or money.");
      // }

      // Flags
      const moneyFlags = ["-m", "--money"];
      const coinsFlags = ["-c", "--coins"];
      let flagUsed = null;
      let amountIndex = -1;

      for (const flag of [...moneyFlags, ...coinsFlags]) {
        const idx = args.indexOf(flag);
        if (idx !== -1) {
          flagUsed = flag;
          amountIndex = idx + 1;
          break;
        }
      }

      if (flagUsed === null) {
        return await message.reply("❌ Missing -m/--money or -c/--coins flag.\n\nUsage: !set -m <amount> [@user]");
      }

      const amount = parseInt(args[amountIndex], 10);
      if (isNaN(amount) || amount < 0) {
        return await message.reply("❌ Please provide a valid non-negative amount.");
      }

      // Fetch existing user data
      const userData = await getUserData(targetId);

      // Update based on flag
      if (moneyFlags.includes(flagUsed)) {
        userData.money = amount;
      } else if (coinsFlags.includes(flagUsed)) {
        userData.coins = amount;
      }

      // Save updated data and lastActive timestamp
      await updateUserData(targetId, {
        ...userData,
        lastActive: Date.now()
      });

      await message.reply(`✅ Successfully set ${moneyFlags.includes(flagUsed) ? "money" : "coins"} to ${amount} for <@${targetId.split('@')[0]}>.`);
      log(`Set: ${senderId} set ${amount} (${flagUsed}) for ${targetId}`, 'info');

    } catch (err) {
      log(`Error in set command: ${err.message}`, 'error');
      await message.reply("❌ An error occurred while setting coins or money.");
    }
  }
};
