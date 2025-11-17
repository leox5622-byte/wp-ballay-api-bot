module.exports = {
	config: {
		name: "tid",
		version: "1.2",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		description: {
			vi: "Xem id nhóm chat của bạn",
			en: "View threadID of your group chat"
		},
		category: "info",
		guide: {
			en: "{pn}"
		}
	},

	onStart: async function ({ message, chat }) {
	   try {
		if (chat && chat.id && chat.id._serialized) {
			message.reply(chat.id._serialized.toString());
		} else {
			message.reply("Unable to retrieve thread ID. The 'chat' object or its 'id' property is undefined.");
		}
	   } catch (error) {
	     console.error(`Error in ${this.config.name}:`, error);
	     await message.reply('❌ An error occurred while executing this command.');
	   }
	 }
};