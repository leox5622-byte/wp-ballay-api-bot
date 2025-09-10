module.exports = {
  config: {
    name: "time",
    version: "1.0",
    author: "Rahaman Leon",
    role: 0,
    description: "Show current date and time",
    category: "utility",
    guide: "{pn}: Show current date and time"
  },

  onStart: async function({ message, client }) {
    const now = new Date();
    const timeString = now.toLocaleString("en-US", {
      hour12: true,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short"
    });

    let responseText = `🕒 Current time:\n${timeString}`;
    let mentions = [];

    if (message.hasQuotedMsg) {
      const quotedMsg = await message.getQuotedMessage();
      // Use author (group message sender) or from (private chat sender)
      const originalSender = quotedMsg.author || quotedMsg.from;
      if (originalSender) {
        mentions.push(originalSender);
        responseText = `@${originalSender.split("@")[0]} ${responseText}`;
      }
    }

    await client.sendMessage(message.from, { text: responseText, mentions });
  }
};
