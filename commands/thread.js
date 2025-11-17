const { getGroupData, updateGroupData } = require('../scripts/helpers');

module.exports = {
  config: {
    name: "thread",
    aliases: ["group", "chat"],
    version: "1.0.3",
    author: "@anbuinfosec",
    countDown: 5,
    role: 1,
    description: "Manage thread/group settings",
    category: "admin",
    guide: "{pn} [setting] [value]\n\nSettings:\n• welcome [on/off] - Toggle welcome messages\n• adminonly [on/off] - Admin only mode\n• info - Show thread information"
  },
  
  onStart: async function({ message, args, client, prefix, config, chat, contact }) {
    try {
      const threadId = message?.key?.remoteJid || message?.from || message?.chatId;
      if (!threadId || !threadId.endsWith('@g.us')) {
        return message.reply('❌ This command can only be used in groups.');
      }

      const group = await getGroupData(threadId);

      if (args.length === 0 || args[0] === 'info') {
        const info = `📋 Thread Information\n\n` +
          `🆔 ID: ${group.id}\n` +
          `👥 Members: ${group.members?.length || 0}\n` +
          `⚙️ Settings:\n` +
          `• Welcome Disabled: ${group.settings?.welcomeDisabled ? '✅ On' : '❌ Off'}\n` +
          `• Goodbye Disabled: ${group.settings?.goodbyeDisabled ? '✅ On' : '❌ Off'}`;
        return message.reply(info);
      }

      const setting = String(args[0] || '').toLowerCase();
      const value = String(args[1] || '').toLowerCase();
      if (!value) return message.reply("❌ Please provide a value (on/off) for the setting.");
      const isEnabled = value === 'on' || value === 'true' || value === '1';
      const isDisabled = value === 'off' || value === 'false' || value === '0';
      if (!isEnabled && !isDisabled) return message.reply("❌ Invalid value. Use 'on' or 'off'.");

      let updated = false;
      switch (setting) {
        case 'welcome':
          await updateGroupData(threadId, { settings: { ...group.settings, welcomeDisabled: isDisabled } });
          updated = true;
          break;
        case 'adminonly':
          await updateGroupData(threadId, { adminOnly: isEnabled });
          updated = true;
          break;
        default:
          return message.reply("❌ Invalid setting. Available: welcome, adminonly");
      }

      if (updated) {
        return message.reply(`✅ Updated setting '${setting}' to ${isEnabled ? 'On' : 'Off'}.`);
      }
    } catch (error) {
      await client.sendMessage(message.from, '❌ An error occurred while managing thread settings.');
    }
  }
};
