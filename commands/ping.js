module.exports = {
    config: {
        name: "ping",
        version: "1.0.0",
        author: "RL",
        coolDown: 3,
        role: 0,
        description: "Test if the bot is responding and show latency",
        category: "utility",
        guide: {
            en: "{prefix}ping"
        }
    },

    onStart: async function ({ message }) {
        try {
            const startTime = Date.now();
            await message.reply("🏓 Pong!");
            const latency = Date.now() - startTime;
            await message.reply(`⏱️ Latency: ${latency}ms`);
        } catch (error) {
            console.error("Error in ping command:", error);
            try { await message.reply("❌ An error occurred while processing the ping command."); } catch (_) {}
        }
    }
};
