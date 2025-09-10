const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "prefix",
        aliases: ["changeprefix", "setprefix"],
        version: "2.1",
        author: "Rahaman Leon",
        coolDown: 5,
        role: 0, // 0 = all users, 1 = group admin, 2 = bot owner
        description: "Change bot prefix for current chat or globally",
        category: "config",
        guide: {
            en: "Use {prefix}prefix <new_prefix> to change prefix for current chat\n" +
                "Use {prefix}prefix <new_prefix> -g to change global prefix (bot owner only)\n" +
                "Use {prefix}prefix reset to reset current chat prefix to global default\n" +
                "Use {prefix}prefix list to see all chat-specific prefixes (bot owner only)\n" +
                "Type 'prefix' to see current prefixes"
        }
    },

    onStart: async function ({ message, args, client, config, chat, contact, isGroup }) {
        try {
            const configPath = path.join(__dirname, '..', 'config.json');
            const currentConfig = await fs.readJSON(configPath);
            
            // If no arguments, show current prefixes
            if (!args[0]) {
                const globalPrefix = currentConfig.bot.prefix;
                const chatPrefix = await this.getChatPrefix(chat.id._serialized);
                const effectivePrefix = chatPrefix || globalPrefix;
                
                // Check if user typed just "prefix" without the bot prefix
                const wasDirectCall = message.body.trim().toLowerCase() === 'prefix';
                const callMethod = wasDirectCall ? 'direct call' : `${effectivePrefix}prefix`;
                
                const prefixInfo = [
                    "🔧Prefix Information",
                    "",
                    `🌐 Global Prefix: \`${globalPrefix}\``,
                    `💬 Chat Prefix: \`${chatPrefix || 'Not set (using global)'}\``,
                    `⚡ Current Effective Prefix: \`${effectivePrefix}\``,
                    "",
                    `📝 Type \`${effectivePrefix}help prefix\` for usage guide`,
                    `📋 Available commands: reset, list${this.isOwner(contact.id._serialized, currentConfig) ? ', -g flag' : ''}`,
                    "",
                    wasDirectCall ? "💡 *Tip: You can type just 'prefix' without the bot prefix!*" : `💡 *Tip: You can also type just 'prefix' directly*`
                ].join('\n');
                
                return await message.reply(prefixInfo);
            }

            // Handle reset command
            if (args[0].toLowerCase() === 'reset') {
                const success = await this.setChatPrefix(chat.id._serialized, null);
                if (success) {
                    return await message.reply(`✅ Chat prefix reset to global default: \`${currentConfig.bot.prefix}\``);
                } else {
                    return await message.reply("❌ Failed to reset chat prefix. Please try again.");
                }
            }

            // Handle list command (owner only)
            if (args[0].toLowerCase() === 'list') {
                if (!this.isOwner(contact.id._serialized, currentConfig)) {
                    return await message.reply("❌ Only bot owners can view the prefix list.");
                }
                
                const prefixList = await this.getAllChatPrefixes();
                if (Object.keys(prefixList).length === 0) {
                    return await message.reply("📋 No chat-specific prefixes set.");
                }
                
                let listMessage = "📋 **Chat-Specific Prefixes:**\n\n";
                for (const [chatId, prefix] of Object.entries(prefixList)) {
                    listMessage += `• \`${chatId}\`: \`${prefix}\`\n`;
                }
                
                return await message.reply(listMessage);
            }

            const newPrefix = args[0];
            const isGlobal = args.includes('-g') || args.includes('--global');

            // Enhanced prefix validation
            const validation = this.validatePrefix(newPrefix);
            if (!validation.valid) {
                return await message.reply(`❌ ${validation.message}`);
            }

            // Check if user is bot owner for global changes
            if (isGlobal) {
                if (!this.isOwner(contact.id._serialized, currentConfig)) {
                    return await message.reply("❌ Only bot owners can change the global prefix.");
                }

                // Backup current config
                const backupPath = path.join(__dirname, '..', 'config.backup.json');
                await fs.writeJSON(backupPath, currentConfig, { spaces: 2 });

                // Update global prefix
                currentConfig.bot.prefix = newPrefix;
                await fs.writeJSON(configPath, currentConfig, { spaces: 2 });
                
                return await message.reply(
                    `✅ Global prefix changed to: \`${newPrefix}\`\n\n` +
                    `⚠️ Bot restart recommended for full effect.\n` +
                    `💾 Previous config backed up to config.backup.json`
                );
            } else {
                // Update chat-specific prefix
                const success = await this.setChatPrefix(chat.id._serialized, newPrefix);
                if (success) {
                    return await message.reply(`✅ Chat prefix changed to: \`${newPrefix}\``);
                } else {
                    return await message.reply("❌ Failed to set chat prefix. Please try again.");
                }
            }

        } catch (error) {
            console.error("Prefix command error:", error);
            await message.reply("❌ An error occurred while changing the prefix. Please contact the bot administrator.");
        }
    },

    // Enhanced helper methods
    validatePrefix(prefix) {
        if (!prefix || typeof prefix !== 'string') {
            return { valid: false, message: "Prefix cannot be empty." };
        }
        
        if (prefix.length > 5) {
            return { valid: false, message: "Prefix cannot be longer than 5 characters." };
        }
        
        if (prefix.length < 1) {
            return { valid: false, message: "Prefix must be at least 1 character long." };
        }
        
        // Allow special characters and some alphanumeric
        if (!/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`a-zA-Z0-9]+$/.test(prefix)) {
            return { valid: false, message: "Prefix contains invalid characters. Use symbols, letters, or numbers only." };
        }
        
        // Check for potentially problematic prefixes
        const reservedPrefixes = ['http', 'https', 'www', 'ftp'];
        if (reservedPrefixes.some(reserved => prefix.toLowerCase().startsWith(reserved))) {
            return { valid: false, message: "This prefix is reserved and cannot be used." };
        }
        
        return { valid: true, message: "Valid prefix" };
    },

    isOwner(userId, config) {
        return config.adminBot && config.adminBot.includes(userId);
    },

    async getChatPrefix(chatId) {
        try {
            const dbPath = path.join(__dirname, '..', 'data', 'chat-prefixes.json');
            
            if (await fs.pathExists(dbPath)) {
                const data = await fs.readJSON(dbPath);
                return data[chatId] || null;
            }
            return null;
        } catch (error) {
            console.error("Error getting chat prefix:", error);
            return null;
        }
    },

    async setChatPrefix(chatId, prefix) {
        try {
            const dbPath = path.join(__dirname, '..', 'data', 'chat-prefixes.json');
            const dbDir = path.dirname(dbPath);
            
            // Ensure directory exists
            await fs.ensureDir(dbDir);
            
            let data = {};
            if (await fs.pathExists(dbPath)) {
                data = await fs.readJSON(dbPath);
            }
            
            if (prefix === null) {
                delete data[chatId];
            } else {
                data[chatId] = prefix;
            }
            
            await fs.writeJSON(dbPath, data, { spaces: 2 });
            
            // Log the change
            console.log(`Prefix ${prefix ? 'set' : 'reset'} for chat ${chatId}: ${prefix || 'removed'}`);
            
            return true;
        } catch (error) {
            console.error("Error setting chat prefix:", error);
            return false;
        }
    },

    async getAllChatPrefixes() {
        try {
            const dbPath = path.join(__dirname, '..', 'data', 'chat-prefixes.json');
            
            if (await fs.pathExists(dbPath)) {
                return await fs.readJSON(dbPath);
            }
            return {};
        } catch (error) {
            console.error("Error getting all chat prefixes:", error);
            return {};
        }
    }
};