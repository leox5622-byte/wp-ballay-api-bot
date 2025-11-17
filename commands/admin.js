// File: admin.js (Plain Text Version)
// Author: Rahaman Leon
// Description: Manage bot admin roles with plain-text output

const fs = require('fs-extra');
const path = require('path');
const { log, normalizeJid } = require('../scripts/helpers');

module.exports = {
    config: {
        name: "admin",
        aliases: [""],
        version: "1.0",
        author: "XXR3XX",
        coolDown: 5,
        role: 2,
        description: "Add, remove, or list bot admin roles (works in groups)",
        category: "owner",
        guide: {
            en: "{prefix}admin add <@tag|reply> - Add bot admin\n" +
                "{prefix}admin remove <@tag|reply> - Remove bot admin\n" +
                "{prefix}admin list - List all bot admins\n" +
                "{prefix}admin check <@tag|reply> - Check if user is bot admin"
        }
    },

    onStart: async function ({ message, args, client, config, contact }) {
        const configPath = path.join(__dirname, '..', 'config.json');

        async function getTargetUserIds() {
            const ids = new Set();

            if (message.hasQuotedMsg) {
                try {
                    const quotedMsg = await message.getQuotedMessage();
                    const authorId = quotedMsg.author || quotedMsg.from;
                    if (authorId) ids.add(normalizeJid(authorId));
                } catch (error) {
                    log(`Error getting quoted message: ${error.message}`, 'warning');
                }
            }

            try {
                const mentions = await message.getMentions();
                if (mentions && mentions.length > 0) {
                    mentions.forEach(m => {
                        if (m && m.id && m.id._serialized) ids.add(normalizeJid(m.id._serialized));
                    });
                }
            } catch (error) {
                log(`Error getting mentions: ${error.message}`, 'warning');
            }

            if (ids.size === 0 && args.length > 1) {
                const phoneArg = args[1].replace(/[^\d]/g, '');
                if (phoneArg.length >= 10) ids.add(normalizeJid(phoneArg));
            }

            return [...ids].filter(id => id && id.trim().length > 0);
        }

        async function getNames(idList) {
            return Promise.all(idList.map(async (id) => {
                try {
                    let name = id.split('@')[0];
                    if (client && typeof client.getContactById === 'function') {
                        try {
                            const contact = await client.getContactById(id);
                            name = contact.name || contact.pushname || name;
                        } catch {}
                    }
                    return `• ${name} (${id})`;
                } catch {
                    return `• ${id}`;
                }
            }));
        }

        async function addAdmins(ids) {
            const added = [], already = [], invalid = [];
            const currentAdminBots = config.adminBot.map(normalizeJid);

            for (const id of ids) {
                const normalizedId = normalizeJid(id);
                if (!normalizedId || (!normalizedId.includes('@s.whatsapp.net') && !normalizedId.includes('@lid'))) {
                    invalid.push(id);
                    continue;
                }
                if (currentAdminBots.includes(normalizedId)) already.push(id);
                else {
                    config.adminBot.push(normalizedId);
                    added.push(id);
                }
            }

            if (added.length > 0 || invalid.length === 0) {
                await fs.writeJSON(configPath, config, { spaces: 2 });
            }

            const res = [];
            if (added.length) {
                const names = await getNames(added);
                res.push(`Added ${added.length} admin(s):\n${names.join('\n')}`);
            }
            if (already.length) {
                const names = await getNames(already);
                res.push(`Already admin(s):\n${names.join('\n')}`);
            }
            if (invalid.length) res.push(`Invalid ID(s): ${invalid.join(', ')}`);
            return res.join('\n\n') || "No changes made.";
        }

        async function removeAdmins(ids) {
            const removed = [], notAdmin = [], protected = [];
            let updatedAdminBot = [...config.adminBot];
            const currentUser = normalizeJid(contact.id._serialized);

            for (const id of ids) {
                const normalizedIdToRemove = normalizeJid(id);
                if (normalizedIdToRemove === currentUser) {
                    protected.push(id);
                    continue;
                }

                const initialLength = updatedAdminBot.length;
                updatedAdminBot = updatedAdminBot.filter(adminId => normalizeJid(adminId) !== normalizedIdToRemove);

                if (updatedAdminBot.length < initialLength) removed.push(id);
                else notAdmin.push(id);
            }

            config.adminBot = updatedAdminBot;

            if (removed.length > 0) {
                await fs.writeJSON(configPath, config, { spaces: 2 });
            }

            const res = [];
            if (removed.length) {
                const names = await getNames(removed);
                res.push(`Removed ${removed.length} admin(s):\n${names.join('\n')}`);
            }
            if (notAdmin.length) {
                const names = await getNames(notAdmin);
                res.push(`Not admin(s):\n${names.join('\n')}`);
            }
            if (protected.length) res.push(`Cannot remove yourself from admin`);
            return res.join('\n\n') || "No changes made.";
        }

        async function checkAdmin(ids) {
            const results = [];
            const currentAdminBots = config.adminBot.map(normalizeJid);

            for (const id of ids) {
                const normalizedId = normalizeJid(id);
                const isAdmin = currentAdminBots.includes(normalizedId);
                const names = await getNames([id]);
                results.push(`${names[0]} - ${isAdmin ? 'Bot Admin' : 'Not Bot Admin'}`);
            }

            return `Admin Status Check:\n\n${results.join('\n')}`;
        }

        try {
            const action = (args[0] || "list").toLowerCase();

            switch (action) {
                case "add":
                case "-a":
                case "promote": {
                    const ids = await getTargetUserIds();
                    if (!ids.length) return message.reply("Please tag someone, reply to their message, or provide a phone number to add as admin.");
                    const res = await addAdmins(ids);
                    return message.reply(res);
                }

                case "remove":
                case "-r":
                case "demote": {
                    const ids = await getTargetUserIds();
                    if (!ids.length) return message.reply("Please tag someone, reply to their message, or provide a phone number to remove from admin.");
                    const res = await removeAdmins(ids);
                    return message.reply(res);
                }

                case "check":
                case "status": {
                    const ids = await getTargetUserIds();
                    if (!ids.length) return message.reply("Please tag someone, reply to their message, or provide a phone number to check admin status.");
                    const res = await checkAdmin(ids);
                    return message.reply(res);
                }

                case "list":
                case "-l":
                case "all":
                default: {
                    if (!config.adminBot.length) return message.reply("No bot admins configured.");

                    const list = await getNames(config.adminBot);
                    const response = `Bot Admins (${list.length}):\n\n${list.join('\n')}`;

                    return message.reply(response);
                }
            }
        } catch (err) {
            log(`Error in admin command: ${err.message}`, 'error');
            return message.reply(`Something went wrong while managing admins: ${err.message}`);
        }
    }
};
