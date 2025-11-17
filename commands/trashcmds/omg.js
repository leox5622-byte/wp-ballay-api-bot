const fs = require('fs');
module.exports = {
	config: {
		name: "omg",
		version: "1.0",
		author: "Otineeeeeyyyyyy",
		countDown: 5,
		role: 0,
		shortDescription: "no prefix",
		longDescription: "no prefix",
		category: "no prefix",
	},
	onStart: async function(){
    try {},
	onChat: async function({ event, message, getLang }) {
		if (event.body && event.body.toLowerCase() === "omg") {
			return message.reply({
      body: "omgggggggggg🤐🤐😦😦😦😧😧😦😧😦😧😦😧😦😦😧😦😧😧😧",
      attachment: fs.createReadStream("omg.mp4"),

    } catch (error) {
      console.error(`Error in ${this.config.name}:`, error);
      await message.reply('❌ An error occurred while executing this command.');
    }
  			});
		}
	}
};