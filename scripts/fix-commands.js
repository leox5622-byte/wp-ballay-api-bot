const fs = require('fs');
const path = require('path');

// Standard command template with consistent parameter handling
const STANDARD_TEMPLATE = `module.exports = {
  config: {
    name: "COMMAND_NAME",
    aliases: [],
    version: "1.0.0",
    author: "DoraBot",
    countDown: 5,
    role: 0,
    description: "Command description",
    category: "utility",
    guide: {
      en: "{prefix}COMMAND_NAME [args]"
    }
  },

  onStart: async function({ message, args, client, prefix, config, chat, contact }) {
    try {
      // Command logic here
      
    } catch (error) {
      console.error(\`Error in \${this.config.name}:\`, error);
      await message.reply('❌ An error occurred while executing this command.');
    }
  }
};`;

// Function to fix parameter handling in a command file
function fixCommandParameters(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix common parameter patterns
    const patterns = [
      // Fix { message, client } -> { message, args, client, prefix, config, chat, contact }
      {
        from: /onStart:\s*async\s+function\s*\(\s*{\s*message,\s*client\s*}\s*\)/g,
        to: 'onStart: async function({ message, args, client, prefix, config, chat, contact })'
      },
      // Fix { message, args, client } -> { message, args, client, prefix, config, chat, contact }
      {
        from: /onStart:\s*async\s+function\s*\(\s*{\s*message,\s*args,\s*client\s*}\s*\)/g,
        to: 'onStart: async function({ message, args, client, prefix, config, chat, contact })'
      },
      // Fix { message, args, client, config } -> { message, args, client, prefix, config, chat, contact }
      {
        from: /onStart:\s*async\s+function\s*\(\s*{\s*message,\s*args,\s*client,\s*config\s*}\s*\)/g,
        to: 'onStart: async function({ message, args, client, prefix, config, chat, contact })'
      },
      // Fix other variations
      {
        from: /onStart:\s*async\s+function\s*\(\s*{\s*message,\s*args,\s*config,\s*prefix\s*}\s*\)/g,
        to: 'onStart: async function({ message, args, client, prefix, config, chat, contact })'
      }
    ];
    
    let modified = false;
    patterns.forEach(pattern => {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed parameters in: ${path.basename(filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Function to add missing error handling
function addErrorHandling(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if error handling already exists
    if (content.includes('try {') && content.includes('catch')) {
      return false; // Already has error handling
    }
    
    // Find the onStart function and wrap its content in try-catch
    const onStartRegex = /(onStart:\s*async\s+function[^{]*{)([\s\S]*?)(^\s*})/m;
    const match = content.match(onStartRegex);
    
    if (match) {
      const [fullMatch, functionStart, functionBody, functionEnd] = match;
      
      // Skip if function body is very short (likely already handled)
      if (functionBody.trim().length < 50) {
        return false;
      }
      
      const wrappedBody = `
    try {${functionBody.replace(/^\s{4}/gm, '      ')}
    } catch (error) {
      console.error(\`Error in \${this.config.name}:\`, error);
      await message.reply('❌ An error occurred while executing this command.');
    }
  `;
      
      content = content.replace(onStartRegex, functionStart + wrappedBody + functionEnd);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Added error handling to: ${path.basename(filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error adding error handling to ${filePath}:`, error.message);
    return false;
  }
}

// Function to fix missing dependencies
function fixMissingDependencies(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Common missing dependencies and their fixes
    const dependencies = {
      'Canvas': "const Canvas = require('canvas');",
      'createCanvas': "const { createCanvas, loadImage } = require('canvas');",
      'Jimp': "const Jimp = require('jimp');",
      'moment': "const moment = require('moment-timezone');",
      'axios': "const axios = require('axios');"
    };
    
    // Check for usage without import
    Object.keys(dependencies).forEach(dep => {
      if (content.includes(dep) && !content.includes(`require('${dep.toLowerCase()}')`)) {
        // Add the require statement at the top
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // Find the last require statement
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('require(')) {
            insertIndex = i + 1;
          }
        }
        
        lines.splice(insertIndex, 0, dependencies[dep]);
        content = lines.join('\n');
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed dependencies in: ${path.basename(filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing dependencies in ${filePath}:`, error.message);
    return false;
  }
}

// Main function to fix all commands
async function fixAllCommands() {
  const commandsDir = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
  
  console.log(`🔧 Starting to fix ${files.length} command files...\n`);
  
  let stats = {
    parametersFixed: 0,
    errorHandlingAdded: 0,
    dependenciesFixed: 0,
    totalFiles: files.length
  };
  
  for (const file of files) {
    const filePath = path.join(commandsDir, file);
    console.log(`\n🔍 Processing: ${file}`);
    
    // Fix parameters
    if (fixCommandParameters(filePath)) {
      stats.parametersFixed++;
    }
    
    // Add error handling
    if (addErrorHandling(filePath)) {
      stats.errorHandlingAdded++;
    }
    
    // Fix dependencies
    if (fixMissingDependencies(filePath)) {
      stats.dependenciesFixed++;
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('=' .repeat(40));
  console.log(`Total files processed: ${stats.totalFiles}`);
  console.log(`Parameters fixed: ${stats.parametersFixed}`);
  console.log(`Error handling added: ${stats.errorHandlingAdded}`);
  console.log(`Dependencies fixed: ${stats.dependenciesFixed}`);
  console.log('\n✅ Command fixing completed!');
}

// Run if called directly
if (require.main === module) {
  fixAllCommands().catch(console.error);
}

module.exports = {
  fixCommandParameters,
  addErrorHandling,
  fixMissingDependencies,
  fixAllCommands
};