const fs = require('fs-extra');
const path = require('path');
const { log, getUserData, updateUserData } = require('./helpers');

// Initialize global DoraBot object if not exists
if (!global.DoraBot) {
    global.DoraBot = {
        commands: new Map(),
        aliases: new Map(),
        onFirstChat: new Map(),
        onChat: new Map(),
        onEvent: new Map(),
        onAnyEvent: new Map(),
        commandFilesPath: [],
        eventCommandsFilesPath: []
    };
}

// Create usersData compatibility object
const usersData = {
    async get(userId, key) {
        try {
            const userData = await getUserData(userId);
            if (!userData) return null;
            
            // Map different key names for compatibility
            const keyMap = {
                'money': 'coins',
                'exp': 'exp',
                'level': 'level',
                'commandCount': 'commandCount',
                'lastActive': 'lastActive'
            };
            
            const mappedKey = keyMap[key] || key;
            return userData[mappedKey] || 0;
        } catch (error) {
            console.error(`Error getting user data for ${userId}:`, error);
            return 0;
        }
    },
    
    async set(userId, key, value) {
        try {
            const keyMap = {
                'money': 'coins',
                'exp': 'exp',
                'level': 'level',
                'commandCount': 'commandCount',
                'lastActive': 'lastActive'
            };
            
            const mappedKey = keyMap[key] || key;
            const updates = { [mappedKey]: value };
            
            return await updateUserData(userId, updates);
        } catch (error) {
            console.error(`Error setting user data for ${userId}:`, error);
            return null;
        }
    },
    
    async add(userId, key, value) {
        try {
            const currentValue = await this.get(userId, key);
            return await this.set(userId, key, currentValue + value);
        } catch (error) {
            console.error(`Error adding to user data for ${userId}:`, error);
            return null;
        }
    }
};

async function loadCommands() {
    const commands = new Map();
    const commandsPath = path.join(__dirname, '..', 'commands');
    
    try {
        await fs.ensureDir(commandsPath);
        const files = await fs.readdir(commandsPath);
        const jsFiles = files.filter(file => file.endsWith('.js') && !global.DoraBot.configCommands.commandUnload?.includes(file));
        
        let loadedCount = 0;
        let failedCount = 0;
        
        for (const file of jsFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);
                
                if (command.config && command.config.name && command.onStart) {
                    // Wrap the onStart function to provide usersData
                    const originalOnStart = command.onStart;
                    command.onStart = async function(params) {
                        // Add usersData to the parameters
                        params.usersData = usersData;
                        
                        // Add getLang function for compatibility
                        if (!params.getLang) {
                            params.getLang = function(key, ...args) {
                                if (command.langs && command.langs.en && command.langs.en[key]) {
                                    let text = command.langs.en[key];
                                    // Simple placeholder replacement
                                    args.forEach((arg, index) => {
                                        text = text.replace(`%${index + 1}`, arg);
                                    });
                                    return text;
                                }
                                return key;
                            };
                        }
                        
                        return await originalOnStart.call(this, params);
                    };
                    
                    // Store command in both maps for compatibility
                    commands.set(command.config.name.toLowerCase(), command);
                    global.DoraBot.commands.set(command.config.name.toLowerCase(), command);
                    
                    // Add aliases
                    if (command.config.aliases) {
                        command.config.aliases.forEach(alias => {
                            commands.set(alias.toLowerCase(), command);
                            global.DoraBot.aliases.set(alias.toLowerCase(), command.config.name.toLowerCase());
                        });
                    }
                    
                    // Store file path for cmd.js
                    global.DoraBot.commandFilesPath.push({
                        filePath: filePath,
                        commandName: [command.config.name, ...(command.config.aliases || [])]
                    });
                    
                    loadedCount++;
                    log(`✅ Loaded command: ${command.config.name}`, 'info');
                } else {
                    failedCount++;
                    log(`⚠️ Invalid command file: ${file} - Missing config, name, or onStart`, 'warning');
                }
            } catch (error) {
                failedCount++;
                log(`❌ Error loading command ${file}: ${error.message}`, 'error');
                console.error(error.stack);
            }
        }
        
        log(`📋 Command loading complete: ${loadedCount} loaded, ${failedCount} failed`, loadedCount > 0 ? 'success' : 'warning');
        return commands;
    } catch (error) {
        log(`❌ Error loading commands: ${error.message}`, 'error');
        return new Map();
    }
}

module.exports = { loadCommands, usersData };