const { exec } = require("child_process");

module.exports = {
  config: {
    name: "shell",
    aliases: [ "terminal"],
    version: "1.2",
    author: "Rahaman Leon | Baileys fix",
    role: 2, // Owner only
    coolDown: 10,
    description: "Execute shell commands (Owner only)",
    category: "owner",
    guide: {
      en: "Use {prefix}shell <command> to execute shell commands"
    }
  },

  onStart: async function({ message, args, config, contact, prefix }) {
    try {
      // Determine requester ID (prefer provided contact param from index.js)
      let requesterId = contact?.id?._serialized;
      if (!requesterId && typeof message.getContact === 'function') {
        try {
          const c = await message.getContact();
          requesterId = c?.id?._serialized;
        } catch {}
      }

      // Owner check with JID normalization (@c.us vs @s.whatsapp.net)
      const normalize = (jid) => (jid || "").split('@')[0].replace(/[^0-9]/g, "");
      const isOwner = Array.isArray(config.adminBot) && requesterId
        ? config.adminBot.some(owner => normalize(owner) === normalize(requesterId))
        : false;
      
      if (!isOwner) {
        return await message.reply("❌ You do not have permission to use this command.");
      }

      if (!args.length) {
        const p = prefix || "!";
        return await message.reply(`⚠️ Please provide a shell command to run.\nUsage: ${p}shell <command>`);
      }

      const command = args.join(" ");
      
      // Security check - block dangerous commands (basic filter)
      const dangerousCommands = [
        'rm -rf', 'del', 'format', 'shutdown', 'reboot', 'passwd',
        'poweroff', 'halt', 'mkfs', ':(){ :|:& };:', 'dd if=', 'chown -R /',
        'systemctl ', 'service ', 'init 0', 'init 6'
      ];
      const lowerCmd = command.toLowerCase();
      const isDangerous = dangerousCommands.some(dangerous => lowerCmd.includes(dangerous));
      
      if (isDangerous) {
        return await message.reply("⚠️ This command is blocked for security reasons.");
      }

      await message.reply("🔄 Executing command...");

      exec(command, { 
        timeout: 15000, 
        maxBuffer: 1024 * 1024 
      }, async (error, stdout, stderr) => {
        try {
          if (error) {
            await message.reply(`❌ Error:\n\n${error.message}`);
            return;
          }
          
          // Some commands write to stderr even on success; include if stdout is empty
          const output = (stdout || '').trim();
          const errout = (stderr || '').trim();
          const combined = output || (errout ? `stderr:\n${errout}` : "✅ Command executed with no output.");

          // Limit message size to avoid WhatsApp message limit
          const reply = combined.length > 1900 ? 
            combined.slice(0, 1900) + "\n\n...[truncated]" : combined;

          await message.reply(`📢 Output:\n\n${reply}`);
        } catch (replyError) {
          console.error("Shell command reply error:", replyError);
        }
      });
    } catch (error) {
      console.error("Shell command error:", error);
      await message.reply("❌ Failed to execute shell command.");
    }
  }
};
