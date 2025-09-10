const util = require("util");
const vm = require("vm");
const { log } = require('../scripts/helpers');

// Security sandbox for eval
const createSandbox = (client, message, config) => {
  return {
    // Safe globals
    console: {
      log: (...args) => args.map(arg => util.inspect(arg)).join(' '),
      error: (...args) => args.map(arg => util.inspect(arg)).join(' '),
      warn: (...args) => args.map(arg => util.inspect(arg)).join(' '),
      info: (...args) => args.map(arg => util.inspect(arg)).join(' ')
    },
    
    // Utility functions
    util,
    JSON,
    Math,
    Date,
    setTimeout: undefined, // Disable timers
    setInterval: undefined,
    setImmediate: undefined,
    
    // Bot context (read-only)
    client: {
      info: client.info,
      getChats: client.getChats.bind(client),
      getContacts: client.getContacts.bind(client),
      // Add more safe methods as needed
    },
    
    message: {
      body: message.body,
      from: message.from,
      to: message.to,
      type: message.type,
      timestamp: message.timestamp,
      // Add more safe properties as needed
    },
    
    // Helper functions
    inspect: (obj) => util.inspect(obj, { depth: 2, colors: false }),
    
    // Restricted require
    require: (module) => {
      const allowedModules = ['util', 'path', 'crypto'];
      if (allowedModules.includes(module)) {
        return require(module);
      }
      throw new Error(`Module '${module}' is not allowed`);
    }
  };
};

module.exports = {
  config: {
    name: "eval",
    aliases: ["e", "evaluate", "exec"],
    version: "2.0",
    author: "Rahaman Leon",
    role: 2, // Bot owner only
    coolDown: 5,
    description: {
      en: "Evaluate JavaScript code in a secure sandbox (Owner only)",
      bn: "নিরাপদ স্যান্ডবক্সে JavaScript কোড চালান (শুধুমাত্র মালিকের জন্য)"
    },
    category: "owner",
    guide: {
      en: "Use {prefix}eval <JavaScript code> to execute code safely"
    }
  },

  onStart: async function({ message, args, config, client }) {
    try {
      // Verify ownership
      const contact = await message.getContact();
      const isOwner = config.adminBot.includes(contact.id._serialized);
      
      if (!isOwner) {
        return await message.reply("❌ Access denied. This command is restricted to bot owners only.");
      }

      if (!args.length) {
        return await message.reply(`❌ No code provided.

📖 **Usage Examples:**
\`\`\`
${config.bot.prefix}eval Math.PI * 2
${config.bot.prefix}eval client.info
${config.bot.prefix}eval "Hello " + "World"
\`\`\`

⚠️ **Security Note:** Code runs in a restricted sandbox.`);
      }

      const code = args.join(" ");
      
      // Log the eval attempt
      log(`Eval command executed by ${contact.name || contact.number}: ${code.substring(0, 100)}${code.length > 100 ? '...' : ''}`, 'warning');

      // Security checks
      const dangerousPatterns = [
        /process\./,
        /require\s*\(/,
        /import\s+/,
        /eval\s*\(/,
        /Function\s*\(/,
        /\.__proto__/,
        /\.constructor/,
        /child_process/,
        /fs\./,
        /http\./,
        /https\./,
        /net\./,
        /os\./,
        /crypto\.random/,
        /global\./,
        /while\s*\(/,
        /for\s*\(/,
        /setInterval/,
        /setTimeout/
      ];

      const isDangerous = dangerousPatterns.some(pattern => pattern.test(code));
      
      if (isDangerous) {
        return await message.reply("❌ **Security Error:** Code contains potentially dangerous operations and has been blocked.");
      }

      try {
        // Create secure sandbox
        const sandbox = createSandbox(client, message, config);
        const context = vm.createContext(sandbox);
        
        // Set timeout for execution
        const timeout = 10000; // 10 seconds
        
        // Execute code in sandbox
        const result = vm.runInContext(code, context, {
          timeout,
          displayErrors: false,
          breakOnSigint: true
        });

        // Handle async results
        let finalResult = result;
        if (result && typeof result.then === 'function') {
          finalResult = await Promise.race([
            result,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Async operation timeout')), timeout)
            )
          ]);
        }

        // Format output
        let output = '';
        if (finalResult === undefined) {
          output = 'undefined';
        } else if (finalResult === null) {
          output = 'null';
        } else if (typeof finalResult === 'string') {
          output = finalResult;
        } else {
          output = util.inspect(finalResult, { 
            depth: 3, 
            colors: false, 
            maxArrayLength: 50,
            maxStringLength: 200
          });
        }

        // Truncate long outputs
        if (output.length > 1800) {
          output = output.substring(0, 1800) + '\n... [output truncated]';
        }

        const executionTime = Date.now() - Date.now();
        await message.reply(`✅ **Execution Result:**
\`\`\`javascript
${output}
\`\`\`

⏱️ Type: ${typeof finalResult}
📊 Length: ${output.length} characters`);

      } catch (evalError) {
        let errorMessage = evalError.message || evalError.toString();
        
        // Clean up error message
        errorMessage = errorMessage.replace(/\s+at\s+.*$/gm, ''); // Remove stack trace
        
        if (errorMessage.length > 1500) {
          errorMessage = errorMessage.substring(0, 1500) + '\n... [error truncated]';
        }

        await message.reply(`❌ **Execution Error:**
\`\`\`
${errorMessage}
\`\`\`

💡 **Common Issues:**
• Syntax errors in JavaScript
• Accessing restricted modules
• Infinite loops or timeouts
• Using undefined variables`);
      }

    } catch (error) {
      log(`Eval command error: ${error.message}`, 'error');
      await message.reply("❌ **System Error:** Failed to execute eval command. Please try again.");
    }
  },

  // Quick eval for simple expressions
  quickEval: async function(expression) {
    try {
      const sandbox = {
        Math,
        Date,
        JSON,
        console: { log: (...args) => args.join(' ') }
      };
      
      const context = vm.createContext(sandbox);
      return vm.runInContext(expression, context, { timeout: 5000 });
    } catch (error) {
      throw new Error(`Quick eval failed: ${error.message}`);
    }
  }
};
