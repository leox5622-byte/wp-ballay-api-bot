// Author: Rahaman Leon
// Command: joke
// Description: Replies with a random programming joke

const jokes = [
  "Why do Java developers wear glasses? Because they don't C#.",
  "I told my bot to tell a joke. It crashed. Guess it wasn’t funny.",
  "Why was the function feeling sad? Because it didn’t get called.",
  "A bug in the code is worth two in the documentation.",
  "404: Joke not found. Try again later."
];

module.exports = {
  config: {
    name: "joke",
    aliases: ["funny", "laugh"],
    version: "1.1.0",
    author: "Rahaman Leon",
    role: 0,
    coolDown: 3,
   category: "fun",
    shortDescription: "Tells a random joke",
    longDescription: "Fetches and sends a random programming joke to lighten the mood"
  },

  onStart: async function({ message, args, client, prefix, config, chat, contact }) {
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    let responseText = `😂 ${joke}`;
    const mentions = [];

    try {
      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        const quotedUserId = quotedMsg.author || quotedMsg.from;
        if (quotedUserId) {
          mentions.push(await client.getContactById(quotedUserId));
          responseText = `@${quotedUserId.split('@')[0]} ${responseText}`;
        }
      }

      await client.sendMessage(message.from, responseText, { mentions });
    } catch (err) {
      console.error("❌ Error sending joke:", err);
      await client.sendMessage(message.from, "❌ Couldn't deliver the joke. Even that failed. Classic.");
    }
  }
};
