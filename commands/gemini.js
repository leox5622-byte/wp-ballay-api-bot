const axios = require('axios');

// Store conversation history in memory
const conversationHistory = new Map();

module.exports = {
    config: {
        name: "gemini",
        version: "1.0.0",
        author: "", // Replace with your name
        coolDown: 5,
        role: 0,
        description: "Chat with Gemini AI",
        category: "ai",
        aliases: ["ai"],
        guide: {
            en: "{prefix}gemini [your message]"
        }
    },

    onStart: async function ({ message, args, client, config }) {
        const prompt = args.join(" ");
        if (!prompt) {
            return message.reply("Please provide a message to chat with Gemini.");
        }

        const senderID = message.sender;
        const history = conversationHistory.get(senderID) || [];

        try {
            const geminiApiKey = config.ai.gemini.apiKey;
            if (!geminiApiKey || geminiApiKey === "your-gemini-api-key") {
                return message.reply("Gemini API key is not configured. Please set it in the config.json file.");
            }

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
                {
                    contents: [...history, { role: "user", parts: [{ text: prompt }] }],
                }
            );

            const geminiResponse = response.data.candidates[0].content.parts[0].text;

            // Update conversation history
            const newHistory = [...history, { role: "user", parts: [{ text: prompt }] }, { role: "model", parts: [{ text: geminiResponse }] }];
            conversationHistory.set(senderID, newHistory);

            message.reply(geminiResponse);

        } catch (error) {
            console.error("Error calling Gemini API:", error.response ? error.response.data : error.message);
            message.reply("An error occurred while communicating with Gemini.");
        }
    },

    onChat: async function ({ message, client, config }) {
        const senderID = message.sender;

        // If the message is a reply to the bot and there's an active conversation
        if (message.hasQuotedMsg && conversationHistory.has(senderID)) {
            const quotedMessage = await message.getQuotedMessage();
            const botId = client.sock.user.id.replace(/:.*$/, "") + "@s.whatsapp.net";

            if (quotedMessage && quotedMessage.author === botId) {
                const prompt = message.body;
                const history = conversationHistory.get(senderID);

                try {
                    const geminiApiKey = config.ai.gemini.apiKey;
                if (!geminiApiKey || geminiApiKey === "your-gemini-api-key") {
                    return; // Silently fail if not configured
                }

                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
                    {
                        contents: [...history, { role: "user", parts: [{ text: prompt }] }],
                    }
                );

                const geminiResponse = response.data.candidates[0].content.parts[0].text;

                // Update conversation history
                const newHistory = [...history, { role: "user", parts: [{ text: prompt }] }, { role: "model", parts: [{ text: geminiResponse }] }];
                conversationHistory.set(senderID, newHistory);

                message.reply(geminiResponse);

            } catch (error) {
                console.error("Error in continuous chat with Gemini:", error.response ? error.response.data : error.message);
                // Optionally, notify the user of the error
                // message.reply("Sorry, I encountered an error trying to continue our conversation.");
                }
            }
        }
    }
};
