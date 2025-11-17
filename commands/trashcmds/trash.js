const DIG = require("discord-image-generation");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "trash",
    version: "1.1",
    author: "KSHITIZ",
    countDown: 5,
    role: 0,
    shortDescription: "",
    longDescription: "",
    category: "meme",
    guide: {
      vi: "{pn} [@tag | để trống]",
      en: ""
    }
  },

  onStart: async function ({
    try { event, message, usersData }) {
      const uid = Object.keys(event.mentions)[0] || event.senderID;
      const avatarURL = await usersData.getAvatarUrl(uid);
      const img = await new DIG.Delete().getImage(avatarURL);
      const pathSave = `${__dirname}/tmp/${uid}_delete.png`;
      fs.writeFileSync(pathSave, Buffer.from(img));
      message.reply({
        attachment: fs.createReadStream(pathSave)

    } catch (error) {
      console.error(`Error in ${this.config.name}:`, error);
      await message.reply('❌ An error occurred while executing this command.');
    }
      }, () => fs.unlinkSync(pathSave));
  }
};