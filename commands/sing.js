const { MessageMedia } = require('../scripts/messageMedia');
const axios = require('axios');

const mahmud = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json");
  return base.data.mahmud;
};

module.exports = {
    config: {
        name: "sing",
        version: "1.7",
        author: "MahMUD", 
        coolDown: 10,
        role: 0,
        category: "music",
        description: "Download and send a song",
        guide: {
            en: "Use {prefix}sing [song name] to download a song"
        }
    },

    onStart: async function({ message, args, client, prefix, config, chat, contact }) {
        if (args.length === 0) {
            return message.reply("❌ | Please provide a song name\n\nExample: sing mood lofi");
        }

        try {
            const query = encodeURIComponent(args.join(" "));
            const apiUrl = `${await mahmud()}/api/sing2?songName=${query}`;

            // Send a loading message
            await message.reply(`🎵 Searching for "${args.join(" ")}"... Please wait...`);

            const response = await axios.get(apiUrl, {
                responseType: "stream",
                headers: { "author": module.exports.config.author },
                timeout: 30000 // Increased timeout to 30 seconds
            });

            // Check if the response is successful
            if (response.status !== 200) {
                return message.reply("❌ Failed to download the song. Please try again.");
            }

            // Convert stream to buffer
            const chunks = [];
            response.data.on('data', chunk => chunks.push(chunk));
            response.data.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const media = new MessageMedia('audio/mpeg', buffer.toString('base64'), `${args.join(" ")}.mp3`);
                    
                    await message.reply(media, {
                        caption: `🎵 Here's your song: ${args.join(" ")}`
                    });
                } catch (mediaError) {
                    console.error("Error sending media:", mediaError);
                    message.reply("❌ Failed to send the audio file. The file might be too large or corrupted.");
                }
            });

            response.data.on('error', (streamError) => {
                console.error("Stream error:", streamError);
                message.reply("❌ Error downloading the song. Please try again.");
            });

        } catch (error) {
            console.error("Error:", error.message);

            if (error.response) {
                console.error("Response error data:", error.response.data);
                console.error("Response status:", error.response.status);
                if (error.response.status === 500) {
                    return message.reply("❌ The song download service is currently unavailable. Please try again later.");
                }
                return message.reply(`❌ An error occurred: ${error.response.data.error || error.message}`);
            }

            message.reply("❌ An error occurred while processing your request. Please try again later.");
        }
    }
};
