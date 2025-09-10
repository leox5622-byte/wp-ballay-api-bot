module.exports = {
    config: {
        name: "help",
        aliases: ["h", "commands"],
        version: "1.1",
        author: "Rahaman Leon",
        coolDown: 5,
        role: 0, // Available to all users
        description: "Show available commands",
        category: "utility",
        guide: {
            en: "Use {prefix}help to see all commands or {prefix}help <command> for specific command info"
        }
    },

    onStart: async function ({ message, args, client, prefix }) {
        try {
            if (args.length > 0) {
                const commandName = args[0].toLowerCase();
                const command = global.DoraBot.commands?.get(commandName);
                
                if (!command) {
                    return await message.reply(`❌ Command "${commandName}" not found.`);
                }

                const description = typeof command.config.description === 'object' ? 
                    command.config.description.en || 'No description available' : 
                    command.config.description || 'No description available';

                const helpText = [
                    `╭─────⭓ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐈𝐍𝐅𝐎`,
                    `│✧Name: ${command.config.name}`,
                    `│✧Description: ${description}`,
                    `│✧Category: ${command.config.category || 'Other'}`,
                    `│✧Cooldown: ${command.config.coolDown || 0}s`,
                    `│✧Author: ${command.config.author || 'Unknown'}`,
                    `│✧Usage: ${prefix}${command.config.name}`,
                    `╰────────────⭓`
                ].join('\n');

                return await message.reply(helpText);
            }

            // Show all commands grouped by category
            const commands = Array.from(global.DoraBot.commands || []);
            if (commands.length === 0) {
                return await message.reply("❌ No commands available.");
            }

            // Get unique commands only (avoid duplicates from aliases)
            const uniqueCommands = new Map();
            commands.forEach(([commandName, command]) => {
                // Only add if this is the main command name (not an alias)
                if (commandName === command.config.name.toLowerCase()) {
                    uniqueCommands.set(commandName, command);
                }
            });

            // Group unique commands by category
            const categories = Array.from(uniqueCommands.values()).reduce((acc, command) => {
                const category = (command.config.category || 'Other').toUpperCase();
                if (!acc[category]) acc[category] = [];
                acc[category].push(command.config.name);
                return acc;
            }, {});

            const chunkCommands = (cmdList, size = 6) => {
                const chunks = [];
                for (let i = 0; i < cmdList.length; i += size) {
                    chunks.push(cmdList.slice(i, i + size));
                }
                return chunks;
            };

            let helpText = '';
            const sortedCategories = Object.keys(categories).sort();

            for (const category of sortedCategories) {
                const cmds = categories[category];
                helpText += `╭─────⭓ 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐘: ${category}\n`;
                const chunks = chunkCommands(cmds, 6);
                for (const chunk of chunks) {
                    helpText += `│✧${chunk.join(' ✧')}\n`;
                }
                helpText += '╰────────────⭓\n\n';
            }

            helpText += `⭔Type ${prefix}help <command> to learn usage.\n`;
            helpText += `⭔Type ${prefix}supportgc to join our bot support group`;

            await message.reply(helpText);

        } catch (error) {
            console.error("Help command error:", error);
            await message.reply("❌ An error occurred while showing help.");
        }
    }
};
