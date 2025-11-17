module.exports = {
  config: {
    name: "spam",
    aurthor:"kim/zed",// Convert By DoraBot Zed
     role: 2,
    shortDescription: " ",
    longDescription: "",
    category: "sophia",
    guide: "{pn}"
  },

  onStart: async function ({
    try { api, event, args }) {
	const amount = parseInt(args[0]);
	const message = args.slice(1).join(" ");

	if (isNaN(amount) || !message) {
		return api.sendMessage("Invalid usage. Usage: /spam [amount] [message]", event.threadID);

    } catch (error) {
      console.error(`Error in ${this.config.name}:`, error);
      await message.reply('❌ An error occurred while executing this command.');
    }
  	}

	for (let i = 0; i < amount; i++) {
		api.sendMessage(message, event.threadID);
	}
  },
};