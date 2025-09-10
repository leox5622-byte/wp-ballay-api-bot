// File: admin.js
// Author: Rahaman Leon
// Description: Manage bot admin roles

const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "admin",
        aliases: ["adminlist", "setadmin"],
        version: "1.8",
        author: "NTKhang | Optimized by Rahaman Leon",
        coolDown: 5,
        role: 2,
        description: "Add, remove, or list bot admin roles",
        category: "owner",
        guide: {
            en: "{prefix}admin add <@tag|reply> - Add bot admin\n" +
                "{prefix}admin remove <@tag|reply> - Remove bot admin\n" +
                "{prefix}admin list - List all bot admins"
        }
    },

    onStart: async function ({ message, args, client, config, chat }) {
        const configPath = path.join(__dirname, '..', 'config.json');

        // Helper to extract user IDs from tag/reply
        async function getTargetUserIds() {
            const ids = new Set();

            if (message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage();
                ids.add(quotedMsg.author || quotedMsg.from);
            }

            const mentions = await message.getMentions();
            mentions.forEach(m => ids.add(m.id._serialized));

            return [...ids];
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

        // Add Admin
        async function addAdmins(ids) {
            const added = [], already = [];

            for (const id of ids) {
                if (config.adminBot.includes(id)) {
                    already.push(id);
                } else {
                    config.adminBot.push(id);
                    added.push(id);
                }
            }

            await fs.writeJSON(configPath, config, { spaces: 2 });

            const res = [];
            if (added.length) {
                const names = await getNames(added);
                res.push(`✅ **Added ${added.length} admin(s):**\n${names.join('\n')}`);
            }
            if (already.length) {
                const names = await getNames(already);
                res.push(`⚠️ **Already admin(s):**\n${names.join('\n')}`);
            }
            return res.join('\n\n') || "❌ No changes made.";
        }

        // Remove Admin
        async function removeAdmins(ids) {
            const removed = [], notAdmin = [];

            for (const id of ids) {
                const index = config.adminBot.indexOf(id);
                if (index > -1) {
                    config.adminBot.splice(index, 1);
                    removed.push(id);
                } else {
                    notAdmin.push(id);
                }
            }

            await fs.writeJSON(configPath, config, { spaces: 2 });

            const res = [];
            if (removed.length) {
                const names = await getNames(removed);
                res.push(`✅ **Removed ${removed.length} admin(s):**\n${names.join('\n')}`);
            }
            if (notAdmin.length) {
                const names = await getNames(notAdmin);
                res.push(`⚠️ **Not admin(s):**\n${names.join('\n')}`);
            }
            return res.join('\n\n') || "❌ No changes made.";
        }

        // Action Dispatcher
        try {
            const action = (args[0] || "").toLowerCase();

            switch (action) {
                case "add":
                case "-a": {
                    const ids = await getTargetUserIds();
                    if (!ids.length) return message.reply("❌ Tag or reply to someone to add as admin.");
                    const res = await addAdmins(ids);
                    return message.reply(res);
                }

                case "remove":
                case "-r": {
                    const ids = await getTargetUserIds();
                    if (!ids.length) return message.reply("❌ Tag or reply to someone to remove from admin.");
                    const res = await removeAdmins(ids);
                    return message.reply(res);
                }

                case "list":
                case "-l": {
                    if (!config.adminBot.length) return message.reply("📝 No bot admins configured.");
                    const list = await getNames(config.adminBot);
                    return message.reply(`👑 **Bot Admins (${list.length}):**\n\n${list.join('\n\n')}`);
                }

                default:
                    return message.reply(
                        `❌ Invalid action.\n\nUsage:\n` +
                        `• ${config.bot.prefix}admin add @user\n` +
                        `• ${config.bot.prefix}admin remove @user\n` +
                        `• ${config.bot.prefix}admin list`
                    );
            }
        } catch (err) {
            console.error("❌ Error in admin command:", err);
            return message.reply("❌ Something went wrong while managing admins.");
        }
    }
};
