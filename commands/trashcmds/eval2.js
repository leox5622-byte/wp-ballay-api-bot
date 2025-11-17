// File: commands/owner/eval.js
// Author: Rahaman Leon (Unlocked Eval)

const util = require("util");
const vm = require("vm");
const { log } = require('../scripts/helpers');

const createSandbox = (client, message, config) => {
  return {
    console,
    util,
    JSON,
    Math,
    Date,
    process,
    require,
    fs: require("fs"),
    os: require("os"),
    path: require("path"),
    child_process: require("child_process"),

    client,
    message,
    inspect: (obj) => util.inspect(obj, { depth: 2, colors: false }),
  };
};

module.exports = {
  config: {
    name: "eval2",
    aliases: ["e2"],
    version: "2.0-unlocked",
    author: "Rahaman Leon",
    role: 2,
    coolDown: 5,
    description: {
      en: "Evaluate unrestricted JavaScript code (Owner only)",
      bn: "JavaScript কোড চালান — সম্পূর্ণ আনলকড (শুধুমাত্র মালিকের জন্য)"
    },
    category: "owner",
    guide: {
      en: "Use {prefix}eval <JavaScript code> to run arbitrary code"
    }
  },

  onStart: async function({ message, args, config, client }) {
    try {
      const contact = await message.getContact();
      const isOwner = config.adminBot.includes(contact.id._serialized);
      if (!isOwner) {
        return await message.reply("❌ Access denied. Only the bot owner may use eval.");
      }

      if (!args.length) {
        return await message.reply(`❌ No code provided.

📖 **Usage Examples:**
\`\`\`
${config.bot.prefix}eval Math.PI * 2
${config.bot.prefix}eval require('fs').readdirSync('./')
${config.bot.prefix}eval require('child_process').execSync('whoami').toString()
\`\`\``);
      }

      const code = args.join(" ");
      log(`Eval by ${contact.name || contact.number}: ${code}`, 'warning');

      const sandbox = createSandbox(client, message, config);
      const context = vm.createContext(sandbox);
      const timeout = 15000;

      let result = vm.runInContext(code, context, {
        timeout,
        displayErrors: false,
        breakOnSigint: true
      });

      if (result && typeof result.then === 'function') {
        result = await Promise.race([
          result,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Async timeout')), timeout))
        ]);
      }

      let output;
      if (result === undefined) output = 'undefined';
      else if (result === null) output = 'null';
      else if (typeof result === 'string') output = result;
      else output = util.inspect(result, { depth: 3, maxArrayLength: 100, maxStringLength: 500 });

      if (output.length > 1800) {
        output = output.slice(0, 1800) + '\n... [output truncated]';
      }

      await message.reply(`✅ Result:
\`\`\`js
${output}
\`\`\`
⏱️ Type: ${typeof result}
📦 Size: ${output.length} chars`);
      
    } catch (err) {
      const cleaned = (err.message || err.toString()).split('\n')[0];
      await message.reply(`❌ **Execution Error:**
\`\`\`
${cleaned}
\`\`\``);
    }
  },

  quickEval: async function(expression) {
    try {
      const sandbox = { Math, Date, JSON, console };
      const context = vm.createContext(sandbox);
      return vm.runInContext(expression, context, { timeout: 5000 });
    } catch (error) {
      throw new Error(`Quick eval failed: ${error.message}`);
    }
  }
};
