const fs = require('fs-extra');
const path = require('path');
const { log } = require('../scripts/helpers');

module.exports = {
    config: {
        name: "whitelist",
        aliases: ["wl", "setwhitelist"],
        version: "1.0",
        author: "Rl",
        coolDown: 5,
        role: 2, // Owner only
        description: "Add, remove, or list whitelist IDs for bot usage",
        category: "owner",
        guide: {
            en: "{prefix}whitelist add <@tag|reply> - Add user(s) to whitelist\n" +
                "{prefix}whitelist remove <@tag|reply> - Remove user(s) from whitelist\n" +
                "{prefix}whitelist list - List all whitelisted users\n" +
                "{prefix}whitelist group add - Add current group to whitelist\n" +
                "{prefix}whitelist group remove - Remove current group from whitelist\n" +
                "{prefix}whitelist group list - List all whitelisted groups"
        }
    },

    onStart: async function ({ message, args, client, config }) {
        const configPath = path.join(__dirname, '..', 'config.json');

        // Helper to extract user IDs from tag/reply or get current thread ID
        async function getTargetIds(isGroupCommand = false, currentThreadId = null) {
            const ids = new Set();

            if (isGroupCommand && currentThreadId) {
                ids.add(currentThreadId);
                return [...ids];
            }

            if (message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage();
                ids.add(quotedMsg.author || quotedMsg.from);
            }

            const mentions = await message.getMentions();
            mentions.forEach(m => ids.add(m.id._serialized));

            return [...ids];
        }

        // Add Whitelist Groups
        async function addWhitelistGroups(groupIds) {
            const added = [], already = [];

            if (!config.whiteListMode || !Array.isArray(config.whiteListMode.whiteListedGroups)) {
                config.whiteListMode = { enabled: false, whiteListIds: [], whiteListedGroups: [] };
            }

            for (const id of groupIds) {
                if (config.whiteListMode.whiteListedGroups.includes(id)) {
                    already.push(id);
                } else {
                    config.whiteListMode.whiteListedGroups.push(id);
                    added.push(id);
                }
            }

            await fs.writeJSON(configPath, config, { spaces: 2 });

            const res = [];
            if (added.length) {
                res.push(`✅ **Added ${added.length} group(s) to whitelist:**\n${added.map(id => `• ${id}`).join('\n')}`);
            }
            if (already.length) {
                res.push(`⚠️ **Already in whitelist:**\n${already.map(id => `• ${id}`).join('\n')}`);
            }
            return res.join('\n\n') || "❌ No changes made.";
        }

        // Remove Whitelist Groups
        async function removeWhitelistGroups(groupIds) {
            const removed = [], notInWhitelist = [];

            if (!config.whiteListMode || !Array.isArray(config.whiteListMode.whiteListedGroups)) {
                return "❌ Group whitelist is not initialized or empty.";
            }

            for (const id of groupIds) {
                const index = config.whiteListMode.whiteListedGroups.indexOf(id);
                if (index > -1) {
                    config.whiteListMode.whiteListedGroups.splice(index, 1);
                    removed.push(id);
                } else {
                    notInWhitelist.push(id);
                }
            }

            await fs.writeJSON(configPath, config, { spaces: 2 });

            const res = [];
            if (removed.length) {
                res.push(`✅ **Removed ${removed.length} group(s) from whitelist:**\n${removed.map(id => `• ${id}`).join('\n')}`);
            }
            if (notInWhitelist.length) {
                res.push(`⚠️ **Not in whitelist:**\n${notInWhitelist.map(id => `• ${id}`).join('\n')}`);
            }
            return res.join('\n\n') || "❌ No changes made.";
        }

        // Helper to get readable names
        async function getNames(idList) {
            return Promise.all(idList.map(async (id) => {
                try {
                    const contact = await client.getContactById(id);
                    return `• ${contact.name || contact.pushname || id.split('@')[0]} (${id})`;
                } catch {
                    return `• ${id}`;
                }
            }));
        }

        // Add Whitelist IDs
        async function addWhitelistIds(ids) {
            const added = [], already = [];

            if (!config.whiteListMode || !Array.isArray(config.whiteListMode.whiteListIds)) {
                config.whiteListMode = { enabled: false, whiteListIds: [] };
            }

            for (const id of ids) {
                if (config.whiteListMode.whiteListIds.includes(id)) {
                    already.push(id);
                } else {
                    config.whiteListMode.whiteListIds.push(id);
                    added.push(id);
                }
            }

            await fs.writeJSON(configPath, config, { spaces: 2 });

            const res = [];
            if (added.length) {
                const names = await getNames(added);
                res.push(`✅ **Added ${added.length} user(s) to whitelist:**\n${names.join('\n')}`);
            }
            if (already.length) {
                const names = await getNames(already);
                res.push(`⚠️ **Already in whitelist:**\n${names.join('\n')}`);
            }
            return res.join('\n\n') || "❌ No changes made.";
        }

        // Remove Whitelist IDs
        async function removeWhitelistIds(ids) {
            const removed = [], notInWhitelist = [];

            if (!config.whiteListMode || !Array.isArray(config.whiteListMode.whiteListIds)) {
                return "❌ Whitelist is not initialized or empty.";
            }

            for (const id of ids) {
                const index = config.whiteListMode.whiteListIds.indexOf(id);
                if (index > -1) {
                    config.whiteListMode.whiteListIds.splice(index, 1);
                    removed.push(id);
                } else {
                    notInWhitelist.push(id);
                }
            }

            await fs.writeJSON(configPath, config, { spaces: 2 });

            const res = [];
            if (removed.length) {
                const names = await getNames(removed);
                res.push(`✅ **Removed ${removed.length} user(s) from whitelist:**\n${names.join('\n')}`);
            }
            if (notInWhitelist.length) {
                const names = await getNames(notInWhitelist);
                res.push(`⚠️ **Not in whitelist:**\n${names.join('\n')}`);
            }
            return res.join('\n\n') || "❌ No changes made.";
        }

        // Action Dispatcher
        try {
            const action = (args[0] || "").toLowerCase();

            switch (action) {
                case "add":
                case "-a": {
                    const ids = await getTargetIds();
                    if (!ids.length) return message.reply("❌ Tag or reply to someone to add to whitelist.");
                    const res = await addWhitelistIds(ids);
                    return message.reply(res);
                }

                case "remove":
                case "-r": {
                    const ids = await getTargetIds();
                    if (!ids.length) return message.reply("❌ Tag or reply to someone to remove from whitelist.");
                    const res = await removeWhitelistIds(ids);
                    return message.reply(res);
                }

                case "list":
                case "-l": {
                    if (!config.whiteListMode || !config.whiteListMode.whiteListIds || !config.whiteListMode.whiteListIds.length) {
                        return message.reply("📝 No users in the whitelist.");
                    }
                    const list = await getNames(config.whiteListMode.whiteListIds);
                    return message.reply(`✅ **Whitelisted Users (${list.length}):**\n\n${list.join('\n\n')}`);
                }

                case "group":
                case "-g": {
                    const groupAction = (args[1] || "").toLowerCase();
                    const currentThreadId = message.chat.id._serialized;

                    switch (groupAction) {
                        case "add":
                        case "-a": {
                            if (!currentThreadId) return message.reply("❌ Cannot identify current group.");
                            const res = await addWhitelistGroups([currentThreadId]);
                            return message.reply(res);
                        }
                        case "remove":
                        case "-r": {
                            if (!currentThreadId) return message.reply("❌ Cannot identify current group.");
                            const res = await removeWhitelistGroups([currentThreadId]);
                            return message.reply(res);
                        }
                        case "list":
                        case "-l": {
                            if (!config.whiteListMode || !config.whiteListMode.whiteListedGroups || !config.whiteListMode.whiteListedGroups.length) {
                                return message.reply("📝 No groups in the whitelist.");
                            }
                            const list = config.whiteListMode.whiteListedGroups.map(id => `• ${id}`);
                            return message.reply(`✅ **Whitelisted Groups (${list.length}):**\n\n${list.join('\n\n')}`);
                        }
                        default:
                            return message.reply(
                                `❌ Invalid group action.\n\nUsage:\n` +
                                `• ${config.bot.prefix}whitelist group add\n` +
                                `• ${config.bot.prefix}whitelist group remove\n` +
                                `• ${config.bot.prefix}whitelist group list`
                            );
                    }
                }

                default:
                    return message.reply(
                        `❌ Invalid action.\n\nUsage:\n` +
                        `• ${config.bot.prefix}whitelist add @user\n` +
                        `• ${config.bot.prefix}whitelist remove @user\n` +
                        `• ${config.bot.prefix}whitelist list\n` +
                        `• ${config.bot.prefix}whitelist group add\n` +
                        `• ${config.bot.prefix}whitelist group remove\n` +
                        `• ${config.bot.prefix}whitelist group list`
                    );
            }
        } catch (err) {
            log(`Error in whitelist command: ${err.message}`, 'error');
            return message.reply("❌ Something went wrong while managing the whitelist.");
        }
    }
};
// End of whitelist.js