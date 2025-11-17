//* ========================================================================================
// * 📚 NEW COMMAND TEMPLATE - Complete Guide for Building WhatsApp Bot Commands
 //* ========================================================================================
 * //
 * This template demonstrates how to create professional, feature-rich commands for your
 * WhatsApp bot. It includes all possible features, best practices, and comprehensive
 * examples with detailed explanations.
 * 
 * 📋 PREREQUISITES & REQUIRED KNOWLEDGE:
 * =====================================
 * 1. JavaScript ES6+ (async/await, destructuring, arrow functions)
 * 2. Node.js fundamentals (modules, npm packages)
 * 3. WhatsApp Web API basics (Baileys library)
 * 4. Database operations (JSON/SQLite)
 * 5. Error handling and debugging
 * 6. Regular expressions for text parsing
 * 7. API integration (REST APIs)
 * 8. File system operations
 * 9. Image/media processing basics
 * 10. Rate limiting and security concepts
 * 
 * 📦 AVAILABLE MODULES & UTILITIES:
 * =================================
 * - fs-extra: Enhanced file system operations
 * - axios: HTTP requests
 * - canvas: Image generation and manipulation
 * - moment: Date/time handling
 * - lodash: Utility functions
 * - node-cache: In-memory caching
 * - sharp: Advanced image processing
 * - qrcode: QR code generation
 * - crypto: Encryption/hashing
 * 
 * 🔧 HOW TO USE THIS TEMPLATE:
 * ============================
 * 1. Copy this file to the 'commands' folder
 * 2. Rename it to your command name (e.g., 'mycommand.js')
 * 3. Modify the config section with your command details
 * 4. Implement your logic in the onStart function
 * 5. Test thoroughly before deploying
 * 
 * ========================================================================================
 */

// Import required modules and utilities
const { 
    getUserData, 
    updateUserData, 
    getGroupData,
    updateGroupData,
    log,
    formatUptime,
    trackCommand 
} = require('../scripts/helpers');

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios').default;
const moment = require('moment');

// Optional: Import MessageMedia for handling media files
// const { MessageMedia } = require('../scripts/messageMedia');

/**
 * COMMAND MODULE EXPORT
 * This is the main structure that the bot expects
 */
module.exports = {
    /**
     * ========================================================================================
     * CONFIGURATION SECTION
     * All command metadata and settings
     * ========================================================================================
     */
    config: {
        // REQUIRED: Unique command name (lowercase, no spaces)
        name: \"examplecommand\",
        
        // OPTIONAL: Alternative names for the command
        aliases: [\"example\", \"ex\", \"demo\"],
        
        // REQUIRED: Version for tracking updates
        version: \"1.0.0\",
        
        // REQUIRED: Author name for credits
        author: \"Your Name\",
        
        // OPTIONAL: Cooldown in seconds between uses (0 = no cooldown)
        coolDown: 5,
        
        // OPTIONAL: Shorthand for coolDown
        countDown: 5,
        
        /**
         * REQUIRED: Permission level
         * 0 = Everyone
         * 1 = Group admins only
         * 2 = Bot admins only
         * 3 = Bot owner only
         */
        role: 0,
        
        // REQUIRED: Brief description of the command
        description: \"A comprehensive example command showing all features\",
        
        // OPTIONAL: Detailed description object with translations
        longDescription: {
            en: \"This is a detailed description that explains everything about the command, its features, and how to use it effectively.\",
            vi: \"Đây là mô tả chi tiết giải thích mọi thứ về lệnh này\"
        },
        
        // REQUIRED: Category for organization (economy, utility, admin, fun, media, etc.)
        category: \"utility\",
        
        // REQUIRED: Usage guide
        guide: {
            en: \"{prefix}example <option> [value] - Shows various command features\
\" +
                \"Options:\
\" +
                \"  text <message> - Process text\
\" +
                \"  user @mention - Get user info\
\" +
                \"  api <query> - Make API call\
\" +
                \"  media - Send media example\
\" +
                \"  button - Interactive button example\
\" +
                \"  list - Interactive list example\",
            vi: \"{prefix}example <tùy chọn> [giá trị]\"
        },
        
        // OPTIONAL: Minimum arguments required
        minArgs: 0,
        
        // OPTIONAL: Maximum arguments allowed
        maxArgs: 10,
        
        // OPTIONAL: Command can only be used in groups
        groupOnly: false,
        
        // OPTIONAL: Command can only be used in DMs
        dmOnly: false,
        
        // OPTIONAL: Command requires bot to be admin
        botAdminRequired: false,
        
        // OPTIONAL: Dependencies or requirements
        dependencies: {
            \"axios\": \"^1.4.0\"
        },
        
        // OPTIONAL: Custom environment variables for this command
        envConfig: {
            apiKey: \"YOUR_API_KEY\",
            apiUrl: \"https://api.example.com\"
        }
    },

    /**
     * ========================================================================================
     * LANGUAGE STRINGS SECTION
     * Multi-language support for your command
     * ========================================================================================
     */
    langs: {
        en: {
            // Success messages
            success: \"✅ Command executed successfully!\",
            processing: \"⏳ Processing your request...\",
            completed: \"✨ Task completed!\",
            
            // Error messages
            error: \"❌ An error occurred: %1\",
            invalid_args: \"❌ Invalid arguments. Usage: %1\",
            no_permission: \"❌ You don't have permission to use this command!\",
            cooldown: \"⏰ Please wait %1 seconds before using this command again.\",
            user_not_found: \"❌ User not found!\",
            
            // Feature-specific messages
            text_result: \"📝 Text result: %1\",
            user_info: \"👤 User Information:\
\" +
                      \"Name: %1\
\" +
                      \"ID: %2\
\" +
                      \"Level: %3\
\" +
                      \"Coins: %4\",
            api_result: \"🌐 API Result: %1\",
            media_sent: \"📷 Media sent successfully!\",
            
            // Interactive messages
            button_prompt: \"Please select an option:\",
            list_title: \"📋 Available Options\",
            list_description: \"Choose from the following:\",
            
            // Data messages
            data_saved: \"💾 Data saved successfully!\",
            data_loaded: \"📂 Data loaded: %1\",
            data_deleted: \"🗑️ Data deleted successfully!\",
            
            // Group-specific messages
            group_only: \"❌ This command can only be used in groups!\",
            dm_only: \"❌ This command can only be used in direct messages!\",
            admin_only: \"❌ Only group admins can use this command!\",
            bot_admin_required: \"❌ Bot needs to be admin to perform this action!\"
        },
        vi: {
            success: \"✅ Lệnh đã thực hiện thành công!\",
            error: \"❌ Đã xảy ra lỗi: %1\",
            // Add Vietnamese translations...
        }
    },

    /**
     * ========================================================================================
     * MAIN COMMAND HANDLER
     * This function is called when the command is executed
     * ========================================================================================
     */
    onStart: async function({ 
        // Core parameters - always available
        message,        // Message object with reply, react methods
        args,           // Array of command arguments
        commandName,    // The command name used (useful with aliases)
        prefix,         // Current bot prefix
        
        // Bot and API access
        client,         // WhatsApp client instance
        api,            // API utilities (if configured)
        
        // User and group data
        event,          // Full event object with all message data
        usersData,      // User database interface
        groupsData,     // Group database interface (if available)
        
        // Utility functions
        getLang,        // Function to get translated strings
        utils,          // Utility functions collection
        
        // Advanced features
        role,           // User's permission level
        commandObj      // The command object itself (this module)
    }) {
        try {
            /**
             * ================================================================================
             * STEP 1: INITIALIZATION & VALIDATION
             * ================================================================================
             */
            
            // Log command usage for analytics
            await trackCommand(commandName, message.author);
            
            // Get user and group information
            const userId = message.author;
            const chatId = message.from;
            const isGroup = message.from.includes('@g.us');
            
            // Check if command can be used in current context
            if (this.config.groupOnly && !isGroup) {
                return message.reply(getLang('group_only'));
            }
            
            if (this.config.dmOnly && isGroup) {
                return message.reply(getLang('dm_only'));
            }
            
            // Permission check example
            if (this.config.role > 0) {
                const userData = await getUserData(userId);
                if (userData.role < this.config.role) {
                    return message.reply(getLang('no_permission'));
                }
            }
            
            // Validate arguments
            if (args.length < (this.config.minArgs || 0)) {
                return message.reply(
                    getLang('invalid_args', `${prefix}${commandName} ${this.config.guide.en}`)
                );
            }
            
            /**
             * ================================================================================
             * STEP 2: COMMAND ROUTING BASED ON SUBCOMMANDS
             * ================================================================================
             */
            
            const subCommand = args[0]?.toLowerCase();
            
            // No arguments - show help or default action
            if (!subCommand) {
                return await this.showHelp({ message, prefix, commandName, getLang });
            }
            
            // Route to different features based on subcommand
            switch (subCommand) {
                case 'text':
                    return await this.handleText({ message, args, getLang });
                    
                case 'user':
                    return await this.handleUserInfo({ message, args, client, getLang });
                    
                case 'api':
                    return await this.handleAPI({ message, args, getLang });
                    
                case 'media':
                    return await this.handleMedia({ message, client, getLang });
                    
                case 'button':
                    return await this.handleButtons({ message, client, getLang });
                    
                case 'list':
                    return await this.handleList({ message, client, getLang });
                    
                case 'data':
                    return await this.handleData({ message, args, userId, getLang });
                    
                case 'group':
                    if (isGroup) {
                        return await this.handleGroupFeatures({ message, chatId, client, getLang });
                    }
                    return message.reply(getLang('group_only'));
                    
                default:
                    return message.reply(getLang('invalid_args', this.config.guide.en));
            }
            
        } catch (error) {
            // Comprehensive error handling
            console.error(`Error in ${this.config.name} command:`, error);
            log(`Command error: ${error.message}`, 'error');
            
            // User-friendly error message
            try {
                await message.reply(getLang('error', error.message));
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    },
    
    /**
     * ========================================================================================
     * FEATURE IMPLEMENTATIONS
     * Separate methods for different command features
     * ========================================================================================
     */
    
    /**
     * Show command help
     */
    async showHelp({ message, prefix, commandName, getLang }) {
        const helpText = `
╭━━━━━━━━━━━━━━━━━╮
┃  📚 COMMAND HELP  ┃
╰━━━━━━━━━━━━━━━━━╯

**Command:** ${commandName}
**Description:** ${this.config.description}
**Cooldown:** ${this.config.coolDown}s
**Category:** ${this.config.category}

**Usage:**
${this.config.guide.en.replace(/{prefix}/g, prefix)}

**Examples:**
• ${prefix}${commandName} text Hello World
• ${prefix}${commandName} user @someone
• ${prefix}${commandName} api weather London
• ${prefix}${commandName} media
• ${prefix}${commandName} button
• ${prefix}${commandName} list

**Aliases:** ${this.config.aliases.join(', ')}
**Author:** ${this.config.author}
`;
        return message.reply(helpText);
    },
    
    /**
     * Handle text processing
     */
    async handleText({ message, args, getLang }) {
        const text = args.slice(1).join(' ');
        
        if (!text) {
            return message.reply('Please provide text to process!');
        }
        
        // Example text processing
        const processed = {
            original: text,
            uppercase: text.toUpperCase(),
            lowercase: text.toLowerCase(),
            reversed: text.split('').reverse().join(''),
            length: text.length,
            wordCount: text.split(' ').length,
            isPalindrome: text.toLowerCase() === text.toLowerCase().split('').reverse().join('')
        };
        
        const result = `
📝 **Text Analysis**
━━━━━━━━━━━━━━━
• Original: ${processed.original}
• Uppercase: ${processed.uppercase}
• Lowercase: ${processed.lowercase}
• Reversed: ${processed.reversed}
• Length: ${processed.length} characters
• Words: ${processed.wordCount}
• Palindrome: ${processed.isPalindrome ? 'Yes ✅' : 'No ❌'}
`;
        
        return message.reply(result);
    },
    
    /**
     * Handle user information retrieval
     */
    async handleUserInfo({ message, args, client, getLang }) {
        // Get mentioned users or use sender
        const mentionedIds = message.mentionedIds || [];
        const targetId = mentionedIds[0] || message.author;
        
        try {
            // Get user data from database
            const userData = await getUserData(targetId);
            
            // Get WhatsApp contact info
            const contact = await client.getContactById(targetId);
            const name = contact.name || contact.pushname || targetId.split('@')[0];
            
            // Format user information
            const info = getLang('user_info', 
                name,
                targetId,
                userData.level || 1,
                userData.coins || 0
            );
            
            // Optional: Add profile picture
            try {
                const profilePicUrl = await client.getProfilePicUrl(targetId);
                if (profilePicUrl) {
                    // You could send the profile picture along with the info
                    // Using MessageMedia or direct URL
                }
            } catch (picError) {
                // Profile picture might not be available
            }
            
            return message.reply(info);
            
        } catch (error) {
            return message.reply(getLang('user_not_found'));
        }
    },
    
    /**
     * Handle API calls example
     */
    async handleAPI({ message, args, getLang }) {
        const query = args.slice(1).join(' ');
        
        if (!query) {
            return message.reply('Please provide a query for the API!');
        }
        
        // Send processing message
        await message.reply(getLang('processing'));
        
        try {
            // Example API call (replace with your actual API)
            const response = await axios.get('https://api.example.com/search', {
                params: { q: query },
                timeout: 10000,
                headers: {
                    'User-Agent': 'WhatsApp-Bot/1.0'
                }
            });
            
            const data = response.data;
            
            // Process and format API response
            const result = `
🌐 **API Result**
━━━━━━━━━━━━━━━
Query: ${query}
Status: ${response.status}
Result: ${JSON.stringify(data, null, 2)}
`;
            
            return message.reply(result);
            
        } catch (error) {
            if (error.response) {
                // API returned an error
                return message.reply(`API Error: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                // Request failed
                return message.reply('Failed to reach the API. Please try again later.');
            } else {
                // Other error
                return message.reply(`Error: ${error.message}`);
            }
        }
    },
    
    /**
     * Handle media sending
     */
    async handleMedia({ message, client, getLang }) {
        try {
            // Example 1: Send an image from URL
            const imageUrl = 'https://via.placeholder.com/300x200.png?text=Example+Image';
            
            // Method 1: Using MessageMedia (if available)
            if (global.MessageMedia) {
                const media = await global.MessageMedia.fromUrl(imageUrl);
                await client.sendMessage(message.from, media, {
                    caption: '📷 Here is an example image!'
                });
            }
            
            // Method 2: Direct URL sending (Baileys)
            await client.sendMessage(message.from, {
                image: { url: imageUrl },
                caption: '📷 Example image with caption!'
            });
            
            // Example 2: Send a generated image using Canvas
            const { createCanvas } = require('canvas');
            const canvas = createCanvas(400, 200);
            const ctx = canvas.getContext('2d');
            
            // Draw on canvas
            ctx.fillStyle = '#7289da';
            ctx.fillRect(0, 0, 400, 200);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Generated Image', 200, 100);
            ctx.font = '20px Arial';
            ctx.fillText(new Date().toLocaleString(), 200, 140);
            
            // Convert to buffer
            const buffer = canvas.toBuffer('image/png');
            
            // Send the generated image
            await client.sendMessage(message.from, {
                image: buffer,
                caption: '🎨 Generated image example!'
            });
            
            // Example 3: Send audio
            await client.sendMessage(message.from, {
                audio: { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
                ptt: true // Send as voice note
            });
            
            // Example 4: Send video
            await client.sendMessage(message.from, {
                video: { url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4' },
                caption: '🎥 Video example'
            });
            
            // Example 5: Send document
            const documentBuffer = Buffer.from('Example document content', 'utf-8');
            await client.sendMessage(message.from, {
                document: documentBuffer,
                fileName: 'example.txt',
                mimetype: 'text/plain'
            });
            
            return message.reply(getLang('media_sent'));
            
        } catch (error) {
            console.error('Media sending error:', error);
            return message.reply('Failed to send media: ' + error.message);
        }
    },
    
    /**
     * Handle interactive buttons
     */
    async handleButtons({ message, client, getLang }) {
        // Create button message
        const buttonMessage = {
            text: getLang('button_prompt'),
            footer: 'Bot v1.0',
            buttons: [
                { buttonId: 'id1', buttonText: { displayText: '✅ Accept' }, type: 1 },
                { buttonId: 'id2', buttonText: { displayText: '❌ Reject' }, type: 1 },
                { buttonId: 'id3', buttonText: { displayText: 'ℹ️ More Info' }, type: 1 }
            ],
            headerType: 1
        };
        
        // Send button message
        await client.sendMessage(message.from, buttonMessage);
        
        // Note: Button responses are usually handled in the message event handler
        // You would need to implement button response handling in your main bot logic
        
        return null; // Don't send additional reply
    },
    
    /**
     * Handle interactive lists
     */
    async handleList({ message, client, getLang }) {
        // Create sections for the list
        const sections = [
            {
                title: 'Category 1',
                rows: [
                    { title: 'Option 1', rowId: 'option1', description: 'Description for option 1' },
                    { title: 'Option 2', rowId: 'option2', description: 'Description for option 2' }
                ]
            },
            {
                title: 'Category 2',
                rows: [
                    { title: 'Option 3', rowId: 'option3', description: 'Description for option 3' },
                    { title: 'Option 4', rowId: 'option4', description: 'Description for option 4' }
                ]
            }
        ];
        
        // Create list message
        const listMessage = {
            text: getLang('list_description'),
            footer: 'Select an option',
            title: getLang('list_title'),
            buttonText: 'Click Here',
            sections
        };
        
        // Send list message
        await client.sendMessage(message.from, listMessage);
        
        return null; // Don't send additional reply
    },
    
    /**
     * Handle data storage operations
     */
    async handleData({ message, args, userId, getLang }) {
        const action = args[1]?.toLowerCase();
        const key = args[2];
        const value = args.slice(3).join(' ');
        
        // Custom data storage path
        const dataPath = path.join(__dirname, '..', 'data', 'custom', `${userId}.json`);
        
        try {
            switch (action) {
                case 'save':
                    if (!key || !value) {
                        return message.reply('Usage: data save <key> <value>');
                    }
                    
                    // Ensure directory exists
                    await fs.ensureDir(path.dirname(dataPath));
                    
                    // Load existing data or create new
                    let data = {};
                    if (await fs.pathExists(dataPath)) {
                        data = await fs.readJson(dataPath);
                    }
                    
                    // Save new data
                    data[key] = value;
                    await fs.writeJson(dataPath, data, { spaces: 2 });
                    
                    return message.reply(getLang('data_saved'));
                    
                case 'load':
                    if (!key) {
                        return message.reply('Usage: data load <key>');
                    }
                    
                    if (await fs.pathExists(dataPath)) {
                        const data = await fs.readJson(dataPath);
                        const loadedValue = data[key];
                        
                        if (loadedValue) {
                            return message.reply(getLang('data_loaded', loadedValue));
                        }
                    }
                    
                    return message.reply('No data found for key: ' + key);
                    
                case 'delete':
                    if (!key) {
                        return message.reply('Usage: data delete <key>');
                    }
                    
                    if (await fs.pathExists(dataPath)) {
                        const data = await fs.readJson(dataPath);
                        delete data[key];
                        await fs.writeJson(dataPath, data, { spaces: 2 });
                        return message.reply(getLang('data_deleted'));
                    }
                    
                    return message.reply('No data to delete');
                    
                case 'list':
                    if (await fs.pathExists(dataPath)) {
                        const data = await fs.readJson(dataPath);
                        const keys = Object.keys(data);
                        
                        if (keys.length > 0) {
                            return message.reply('📦 Stored keys:\
' + keys.join('\
'));
                        }
                    }
                    
                    return message.reply('No stored data');
                    
                default:
                    return message.reply('Usage: data <save|load|delete|list> <key> [value]');
            }
        } catch (error) {
            return message.reply('Data operation failed: ' + error.message);
        }
    },
    
    /**
     * Handle group-specific features
     */
    async handleGroupFeatures({ message, chatId, client, getLang }) {
        try {
            // Get group metadata
            const groupMetadata = await client.groupMetadata(chatId);
            const groupData = await getGroupData(chatId);
            
            // Get group info
            const info = `
👥 **Group Information**
━━━━━━━━━━━━━━━━━━━
• Name: ${groupMetadata.subject}
• Description: ${groupMetadata.desc || 'No description'}
• Owner: ${groupMetadata.owner}
• Members: ${groupMetadata.participants.length}
• Created: ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}
• Admins: ${groupMetadata.participants.filter(p => p.admin).length}

📊 **Statistics**
• Total Messages: ${groupData.messageCount || 0}
• Active Users: ${groupData.activeUsers?.length || 0}
• Commands Used: ${groupData.commandCount || 0}
`;
            
            return message.reply(info);
            
        } catch (error) {
            return message.reply('Failed to get group info: ' + error.message);
        }
    },
    
    /**
     * ========================================================================================
     * ADVANCED FEATURES & UTILITIES
     * ========================================================================================
     */
    
    /**
     * Custom cooldown handler (optional - override default)
     */
    async onCoolDown({ message, getLang, data }) {
        const timeLeft = data.timeLeft;
        return message.reply(getLang('cooldown', Math.ceil(timeLeft / 1000)));
    },
    
    /**
     * Pre-execution hook (optional)
     */
    async onBeforeStart({ message, args }) {
        // Perform checks or modifications before main execution
        console.log(`Command ${this.config.name} starting with args:`, args);
        return true; // Return false to cancel execution
    },
    
    /**
     * Post-execution hook (optional)
     */
    async onAfterStart({ message, result }) {
        // Perform actions after command execution
        console.log(`Command ${this.config.name} completed`);
    },
    
    /**
     * Auto-reply handler for this command (optional)
     */
    async onChat({ message, args }) {
        // Handle auto-replies when command name is mentioned in chat
        // This is called when the command name appears in regular messages
    },
    
    /**
     * Reaction handler (optional)
     */
    `
}


