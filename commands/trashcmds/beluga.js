module.exports = {
 config: {
 name: "beluga",
 version: "1.0",
 author: "XyryllPanget",
 countDown: 5,
 role: 0,
 shortDescription: "no prefix",
 longDescription: "no prefix",
 category: "no prefix",
 }, 
 onStart: async function(){
    try {}, 
 onChat: async function({ event, message, getLang }) {
 if (event.body && event.body.toLowerCase() === "beluga") {
 return message.reply({
 body: "pusa na naman tangina ka meow🐱",
 attachment: await global.utils.getStreamFromURL("https://i.imgur.com/5ZMQzkl.jpg")

    } catch (error) {
      console.error(`Error in ${this.config.name}:`, error);
      await message.reply('❌ An error occurred while executing this command.');
    }
   });
 }
 }
}