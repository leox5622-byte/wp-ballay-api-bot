const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const NodeCache = require('node-cache');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode'); // Add this package: npm install qrcode
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const config = require('./config.json');
const { loadCommands } = require('./scripts/cmdloadder');
const { loadEvents } = require('./scripts/eventsIndex');
const { initDatabase, log, formatUptime, trackCommand, normalizeJid } = require('./scripts/helpers');
const RateLimiter = require('./scripts/rateLimiter');
const WebDashboard = require('./dashboard/WebDashboard'); // Import web dashboard
const BaileysCompat = require('./scripts/baileysCompat');
const { MessageMedia } = require('./scripts/messageMedia');
const cron = require('node-cron');

// Initialize global DoraBot object for compatibility
global.DoraBot = {
    configCommands: {},
    commands: new Map(),
    eventCommands: new Map(),
    aliases: new Map(),
    onFirstChat: [],
    onChat: [],
    onEvent: [],
    onAnyEvent: [],
    onReaction: new Map(),
    commandFilesPath: [],
    eventCommandsFilesPath: [],
    envCommands: {},
    envEvents: {},
    envGlobal: {}
};

// Initialize global utils object
global.utils = {
    log: log,
    loading: {
        info: (type, message) => console.log(`[${type}] ${message}`)
    },
    removeHomeDir: (str) => str.replace(process.cwd(), ''),
    loadScripts: null,
    unloadScripts: null
};

// Initialize global client object
global.client = {
    dirConfigCommands: path.join(__dirname, 'data', 'config.json')
};

// Make MessageMedia globally available for commands
global.MessageMedia = MessageMedia;

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Initialize config commands file if it doesn't exist
const configCommandsPath = path.join(__dirname, 'data', 'config.json');
if (!fs.existsSync(configCommandsPath)) {
    fs.writeFileSync(configCommandsPath, JSON.stringify({
        commandUnload: [],
        commandEventUnload: [],
        envCommands: {},
        envEvents: {},
        envGlobal: {}
    }, null, 2));
}

// Load existing config commands
try {
    global.DoraBot.configCommands = JSON.parse(fs.readFileSync(configCommandsPath, 'utf8'));
} catch (error) {
    global.DoraBot.configCommands = {
        commandUnload: [],
        commandEventUnload: [],
        envCommands: {},
        envEvents: {},
        envGlobal: {}
    };
}

class WhatsAppBot {
    constructor() {
        this.config = config;
        this.commands = new Map();
        this.events = new Map();
        this.cooldowns = new Map();
        this.startTime = Date.now();
        this.qrCode = null;
        this.isAuthenticated = false;
        this.webDashboard = null;
        this.sock = null;
        this.authState = null;
        this.saveCreds = null;
        this.spinner = null;
        this.ora = null;
        this.initStartTime = Date.now();
        
        // Initialize rate limiter
        const rateLimitConfig = this.config.rateLimiting || {};
        this.rateLimiter = new RateLimiter({
            maxRequests: rateLimitConfig.maxRequests || 25,
            windowMs: rateLimitConfig.windowMs || 60000,
            minDelay: rateLimitConfig.minDelay || 1200,
            maxDelay: rateLimitConfig.maxDelay || 10000
        });
        
        // Initialize optimized message store and group cache with size limits
        this.store = {
            chats: new Map(),
            contacts: new Map(),
            messages: new Map(),
            bind: (eventEmitter) => {
                // Optimized store binding with memory management
                eventEmitter.on('chats.upsert', (chats) => {
                    chats.forEach(chat => {
                        this.store.chats.set(chat.id, chat);
                        // Limit chat cache size to prevent memory leaks
                        if (this.store.chats.size > 1000) {
                            const firstKey = this.store.chats.keys().next().value;
                            this.store.chats.delete(firstKey);
                        }
                    });
                });
                eventEmitter.on('contacts.upsert', (contacts) => {
                    contacts.forEach(contact => {
                        this.store.contacts.set(contact.id, contact);
                        // Limit contact cache size
                        if (this.store.contacts.size > 2000) {
                            const firstKey = this.store.contacts.keys().next().value;
                            this.store.contacts.delete(firstKey);
                        }
                    });
                });
                eventEmitter.on('messages.upsert', ({ messages }) => {
                    messages.forEach(msg => {
                        this.store.messages.set(msg.key.id, msg);
                        // Limit message cache size to prevent memory bloat
                        if (this.store.messages.size > 500) {
                            const firstKey = this.store.messages.keys().next().value;
                            this.store.messages.delete(firstKey);
                        }
                    });
                });
            }
        };
        this.groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false, maxKeys: 100 });
        
        // Sync with global DoraBot
        global.DoraBot.commands = this.commands;
        
        // Initialize Baileys logger
        this.logger = P({ level: 'silent' });
        this.compat = null; // Will be initialized after socket creation

        // Setup dashboard first so it's ready to receive QR code
        this.setupDashboard();
        this.setupAutoTasks();
    }

    async initialize() {
        try {
            const { default: ora } = await import('ora');
            this.ora = ora;

            this.showProgress('🚀 Starting WhatsApp Bot V2...', 0);
            
            // Initialize database
            this.showProgress('💾 Initializing database...', 20);
            await initDatabase();
            
            // Load commands and events in parallel
            this.showProgress('📋 Loading commands and events...', 40);
            const [commandsResult, eventsResult] = await Promise.all([
                this.loadCommands(),
                this.loadEvents()
            ]);
            
            // Initialize Baileys auth state
            this.showProgress('🔐 Setting up authentication...', 60);
            const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
            this.authState = state;
            this.saveCreds = saveCreds;
            
            // Get latest Baileys version
            this.showProgress('📡 Fetching Baileys version...', 70);
            const { version, isLatest } = await fetchLatestBaileysVersion();
            log(`Using Baileys v${version.join('.')}, isLatest: ${isLatest}`, 'info');
            
            // Create Baileys socket
            this.showProgress('🔌 Creating WhatsApp connection...', 80);
            await this.createSocket();
            
            this.showProgress('⚙️ Finalizing setup...', 90);
            
            const initTime = Date.now() - this.initStartTime;
            this.showProgress(`✅ Bot initialized in ${(initTime/1000).toFixed(1)}s!`, 100, true);
            
            setTimeout(() => this.showStartupSummary(initTime), 500);
        } catch (error) {
            if (this.spinner) {
                this.spinner.fail(`❌ Failed to initialize: ${error.message}`);
            } else {
                log(`❌ Failed to initialize bot: ${error.message}`, 'error');
            }
            process.exit(1);
        }
    }

    showProgress(message, percentage, isComplete = false) {
        if (process.stdout.isTTY && !this.spinner) {
            if (!this.ora) {
                log(message, 'info');
                return;
            }
            this.spinner = this.ora({
                text: message,
                spinner: 'dots2',
                color: 'cyan'
            }).start();
        } else if (this.spinner) {
            if (isComplete) {
                this.spinner.succeed(message);
                this.spinner = null;
            } else {
                this.spinner.text = `${message} [${percentage}%]`;
            }
        } else {
            log(message, isComplete ? 'success' : 'info');
        }
    }

    showStartupSummary(initTime) {
        console.log('\n' + '='.repeat(55));
        console.log('🎉 WhatsApp Bot V2 - Ready to Serve!');
        console.log('='.repeat(55));
        console.log(`⚡ Startup Time: ${(initTime/1000).toFixed(2)} seconds`);
        console.log(`📋 Commands: ${this.commands.size} loaded`);
        console.log(`🎯 Events: ${this.events.size} loaded`);
        console.log(`👑 Admins: ${this.config.adminBot.length} configured`);
        console.log(`🔧 Prefix: "${this.config.bot.prefix}"`);
        
        if (this.config.dashBoard.enabled) {
            console.log(`📊 Dashboard: http://localhost:${this.config.dashBoard.port || 3000}`);
        }
        
        console.log(`💾 Database: ${this.config.database.type.toUpperCase()}`);
        console.log('='.repeat(55));
        console.log('✅ Bot is ready for messages!');
        console.log('💡 Send "!help" to see available commands');
        console.log('='.repeat(55) + '\n');
    }

    async createSocket() {
        const { version } = await fetchLatestBaileysVersion();
        
        this.sock = makeWASocket({
            version,
            logger: this.logger,
            printQRInTerminal: true,
            auth: this.authState,
            browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true
        });
        
        // Bind store to socket events
        this.store.bind(this.sock.ev);
        
        // Initialize compatibility layer
        this.compat = new BaileysCompat(this.sock);
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Connection updates
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                log('📱 QR Code generated for WhatsApp authentication', 'info');
                try {
                    // Generate QR code as data URL for web display
                    this.qrCode = await QRCode.toDataURL(qr, {
                        width: 256,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });
                    
                    // Emit to web dashboard if available
                    if (this.webDashboard) {
                        this.webDashboard.emitQR(this.qrCode);
                    }
                    
                    log('📱 QR Code available on web dashboard', 'info');
                } catch (error) {
                    log(`❌ Error generating web QR code: ${error.message}`, 'error');
                }
            }
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                log(`Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`, 'warning');
                
                if (shouldReconnect) {
                    await this.createSocket();
                } else {
                    log('Device logged out, please scan QR code again', 'warning');
                    this.isAuthenticated = false;
                }
            } else if (connection === 'open') {
                const connectedUser = this.sock.user?.id || 'Unknown';
                log(`🎉 Connected as: ${connectedUser}`, 'success');
                
                console.log('\n' + '✅'.repeat(20));
                console.log('🟢 STATUS: ONLINE AND READY');
                console.log(`📱 WhatsApp: ${connectedUser}`);
                console.log('🤖 Bot: Fully Operational');
                console.log('✅'.repeat(20) + '\n');
                
                this.isAuthenticated = true;
                this.qrCode = null;
                
                // Emit authentication status to web dashboard
                if (this.webDashboard) {
                    this.webDashboard.emitAuthenticated({
                        user: connectedUser,
                        message: 'Bot is now connected and ready!'
                    });
                }
                
                // Check for restart notification
                setTimeout(async () => {
                    await this.checkRestartNotification();
                }, 3000);
            }
         });
         
         // Credentials update
         this.sock.ev.on('creds.update', this.saveCreds);
         
         // Messages handling
         this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
             if (type === 'notify') {
                 for (const message of messages) {
                     if (!message.key.fromMe && message.message) {
                         await this.handleMessage(message);
                     }
                 }
             }
         });
         
         // Groups update for cache management
         this.sock.ev.on('groups.update', async (updates) => {
             for (const update of updates) {
                 try {
                     const metadata = await this.sock.groupMetadata(update.id);
                     this.groupCache.set(update.id, metadata);
                 } catch (error) {
                     log(`Error updating group cache for ${update.id}: ${error.message}`, 'error');
                 }
             }
         });

        // Note: All event handling is now done in the connection.update and messages.upsert handlers above
        
        // Override sock sendMessage method to use rate limiting
        const originalSendMessage = this.sock.sendMessage.bind(this.sock);
        this.sock.sendMessage = async (jid, content, options) => {
            return await this.rateLimiter.queueRequest(
                () => originalSendMessage(jid, content, options),
                jid,
                1
            );
        };

        // Add rate-limited reply method
        // Additional helper method for rate-limited sending
        this.sock.sendMessageWithRateLimit = async (jid, content, options = {}) => {
            try {
                return await this.rateLimiter.queueRequest(
                    () => originalSendMessage(jid, content, options),
                    jid,
                    options.priority || 1
                );
            } catch (error) {
                log(`❌ Failed to send message: ${error.message}`, 'error');
                throw error;
            }
        };
        
        // Group events handling for Baileys
        this.sock.ev.on('group-participants.update', async (update) => {
            const { id, participants, action } = update;
            
            // Whitelist: only handle group events for whitelisted groups when enabled
            const wl = this.config.whiteListMode || {};
            if (wl.enabled) {
                const list = Array.isArray(wl.whiteListIds) ? wl.whiteListIds : [];
                const normalizePair = (jid) => jid.includes('@g.us') ? [jid] : [jid];
                const inList = (jid) => normalizePair(jid).some(x => list.includes(x));
                if (!inList(id)) {
                    return; // silent for non-whitelisted groups
                }
            }
            
            if (action === 'add' && this.events.has('welcome')) {
                 const welcomeEvent = this.events.get('welcome');
                 await welcomeEvent.execute(this.compat, { chatId: id, participants, action });
             }
             
             if (action === 'remove' && this.events.has('leave')) {
                 const leaveEvent = this.events.get('leave');
                 await leaveEvent.execute(this.compat, { chatId: id, participants, action });
             }
        });
        
        // Message revoke handling
        this.sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                // Whitelist: only handle unsend for whitelisted chats when enabled
                const wl = this.config.whiteListMode || {};
                if (wl.enabled) {
                    const chatId = update?.key?.remoteJid || '';
                    const list = Array.isArray(wl.whiteListIds) ? wl.whiteListIds : [];
                    const inList = (jid) => list.includes(jid) || list.includes(jid.replace('@s.whatsapp.net', '@c.us')) || list.includes(jid.replace('@c.us', '@s.whatsapp.net'));
                    if (!inList(chatId)) continue;
                }
                if (update.update.messageStubType === 'REVOKE' && this.events.has('unsend')) {
                     await this.events.get('unsend').execute(this.compat, update);
                }
            }
        });
    }

    async handleMessage(message) {
        try {
            // Skip if bot message or status
            if (message.key.fromMe) return;

            // Extract message content and details
            const messageContent = message.message?.conversation || 
                                 message.message?.extendedTextMessage?.text || 
                                 message.message?.imageMessage?.caption || 
                                 message.message?.videoMessage?.caption || '';
            
            if (!messageContent) return;

            // Get chat and contact details
            const chatId = message.key.remoteJid;
            const isGroup = chatId.endsWith('@g.us');
            const senderId = message.key.participant || message.key.remoteJid;
            const prefix = await this.getEffectivePrefix(chatId);

            // Derive contextInfo and mentions for WWebJS compatibility
            const contextInfo = message.message?.extendedTextMessage?.contextInfo
                || message.message?.imageMessage?.contextInfo
                || message.message?.videoMessage?.contextInfo
                || message.message?.documentMessage?.contextInfo
                || message.message?.audioMessage?.contextInfo
                || message.message?.stickerMessage?.contextInfo
                || {};
            const mentionedIds = contextInfo.mentionedJid || [];

            // Create message wrapper for compatibility
            const messageWrapper = {
                body: messageContent,
                from: chatId,
                sender: senderId,
                isGroup: isGroup,
                key: message.key,
                message: message.message,
                hasQuotedMsg: !!(contextInfo && contextInfo.quotedMessage),
                getQuotedMessage: async () => {
                    const q = contextInfo?.quotedMessage;
                    if (!q) return null;
                    const author = contextInfo?.participant || senderId;
                    const typeKey = Object.keys(q)[0];
                    const content = q[typeKey] || {};
                    const hasMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(typeKey);
                    const simpleType = (
                        typeKey === 'imageMessage' ? 'image' :
                        typeKey === 'videoMessage' ? 'video' :
                        typeKey === 'audioMessage' ? 'audio' :
                        typeKey === 'documentMessage' ? 'document' :
                        typeKey === 'stickerMessage' ? 'sticker' : 'text'
                    );
                    const downloadMedia = async () => {
                        try {
                            const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                            const stream = await downloadContentFromMessage(content, typeKey.replace('Message', ''));
                            let buffer = Buffer.from([]);
                            for await (const chunk of stream) {
                                buffer = Buffer.concat([buffer, chunk]);
                            }
                            const mimetype = content.mimetype || (typeKey === 'stickerMessage' ? 'image/webp' : (typeKey === 'imageMessage' ? 'image/jpeg' : 'application/octet-stream'));
                            return { data: buffer.toString('base64'), mimetype };
                        } catch (e) {
                            return null;
                        }
                    };
                    return {
                        from: chatId,
                        author,
                        hasMedia,
                        type: simpleType,
                        downloadMedia,
                        body: content?.caption || q?.conversation || q?.extendedTextMessage?.text || ''
                    };
                },
                getMentions: async () => {
                    return mentionedIds.map(id => ({
                        id: { _serialized: id },
                        name: id.split('@')[0],
                        pushname: id.split('@')[0]
                    }));
                },
                mentionedIds,
                reply: async (content, options = {}) => {
                    try {
                        // String text reply
                        if (typeof content === 'string') {
                            return await this.sock.sendMessage(chatId, { text: content }, { quoted: message, ...options });
                        }
                        // MessageMedia-like object
                        if (content && content.mimetype) {
                            const buffer = Buffer.isBuffer(content.data) ? content.data : Buffer.from(content.data, 'base64');
                            const mediaType = content.mimetype.startsWith('image/') ? 'image' :
                                (content.mimetype.startsWith('video/') ? 'video' :
                                (content.mimetype.startsWith('audio/') ? 'audio' : 'document'));
                            const msg = {
                                [mediaType]: buffer,
                                mimetype: content.mimetype,
                                fileName: content.filename,
                                caption: options.caption
                            };
                            return await this.sock.sendMessage(chatId, msg, { quoted: message, ...options });
                        }
                        // Raw content object
                        if (content && typeof content === 'object') {
                            return await this.sock.sendMessage(chatId, content, { quoted: message, ...options });
                        }
                        // Fallback to string
                        return await this.sock.sendMessage(chatId, { text: String(content) }, { quoted: message, ...options });
                    } catch (error) {
                        log(`Error sending reply: ${error.message}`, 'error');
                    }
                },
                react: async (emoji) => {
                    try {
                        await this.sock.sendMessage(chatId, { react: { text: emoji, key: message.key } });
                    } catch (error) {
                        log(`Error sending reaction: ${error.message}`, 'error');
                    }
                },
                SyntaxError: async (text) => {
                    try {
                        const hint = (typeof text === 'string' && text.trim().length > 0)
                            ? text
                            : '❌ Invalid syntax. Use the help command for usage, e.g., {prefix}help <command>.';
                        await this.sock.sendMessage(chatId, { text: hint }, { quoted: message });
                    } catch (error) {
                        log(`Error sending syntax error message: ${error.message}`, 'error');
                    }
                }
            };

            // Create chat and contact objects for compatibility
            const chat = {
                id: { _serialized: chatId },
                isGroup: isGroup
            };

            const contact = {
                id: { _serialized: senderId },
                name: message.pushName || senderId.split('@')[0],
                number: senderId.split('@')[0]
            };

            // Enforce whitelist globally (silent) for any incoming message before any handling
            const wl = this.config.whiteListMode || {};
            if (wl.enabled) {
                const whiteListUserIds = Array.isArray(wl.whiteListIds) ? wl.whiteListIds : [];
                const whiteListedGroups = Array.isArray(wl.whiteListedGroups) ? wl.whiteListedGroups : [];

                // Removed local getBare and normalizePair, using global normalizeJid
                const inWhiteListUser = (id) => {
                    const normalizedId = normalizeJid(id);
                    return whiteListUserIds.some(whiteListId => normalizeJid(whiteListId) === normalizedId);
                };
                const ownerList = Array.isArray(this.config.adminBot) ? this.config.adminBot : [];
                const isOwner = (() => {
                    const uid = contact.id._serialized;
                    const normalizedUid = normalizeJid(uid);
                    return ownerList.some(adminId => normalizeJid(adminId) === normalizedUid);
                })();

                const allowedByGroup = isGroup ? whiteListedGroups.some(groupId => normalizeJid(groupId) === normalizeJid(chat.id._serialized)) : false;
                const allowedByUser = inWhiteListUser(contact.id._serialized);

                if (!(isOwner || allowedByUser || allowedByGroup)) {
                    // Silent drop: do not process events, onChat, commands, or send notifications
                    return;
                }
            }

            // Special handling for common commands without prefix
            const messageBody = messageContent.trim().toLowerCase();
            const specialCommands = {
                'prefix': 'prefix',
                'help': 'help',
                'commands': 'help'
            };
            
            if (specialCommands[messageBody]) {
                 const commandName = specialCommands[messageBody];
                 const command = this.commands.get(commandName);
                 if (command) {
                     try {
                         // Enforce permissions (including whitelist) for special commands
                         const allowed = await this.checkPermissions(command, messageWrapper, chat, contact, isGroup);
                         if (!allowed) return;
                         
                         await command.onStart({
                             message: messageWrapper,
                             args: messageBody === 'commands' ? ['commands'] : [],
                             chat,
                             contact,
                             isGroup,
                             client: this.compat,
                             config: this.config,
                             prefix,
                             rateLimiter: this.rateLimiter
                         });
                         log(`✅ Special command '${messageBody}' executed by ${contact.name || contact.number}`, 'info');
                         return;
                     } catch (error) {
                         log(`❌ Error executing special command '${messageBody}': ${error.message}`, 'error');
                         await messageWrapper.reply(`❌ An error occurred while processing the ${messageBody} command.`);
                         return;
                     }
                 }
             }

            // Check if message starts with prefix
            if (!messageContent.startsWith(prefix)) {
                // Handle non-command messages if needed
                if (this.events.has('message')) {
                    await this.events.get('message').execute(this.compat, messageWrapper, { chat, contact, isGroup });
                }
                
                // Check for onChat handlers in commands
                for (const [, command] of this.commands) {
                    if (command.onChat) {
                        try {
                            await command.onChat({ message: messageWrapper, client: this.compat, config: this.config, chat, contact, isGroup });
                        } catch (error) {
                            log(`❌ Error in onChat for ${command.config.name}: ${error.message}`, 'error');
                        }
                    }
                }
                return;
            }

            // Parse command
            const args = messageContent.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // Get command
            const command = this.commands.get(commandName);
            if (!command) {
                if (!this.config.hideNotiMessage.commandNotFound) {
                    await messageWrapper.reply(`>🎀\n𝐓𝐡𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝 "${commandName}" 𝐝𝐨𝐞𝐬 𝐧𝐨𝐭 𝐞𝐱𝐢𝐬𝐭, 𝐭𝐲𝐩𝐞 ${prefix}𝐡𝐞𝐥𝐩 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐲𝐚𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬`);
                }
                return;
            }

            // Check permissions
            if (!await this.checkPermissions(command, messageWrapper, chat, contact, isGroup)) {
                return;
            }

            // Check cooldown
            if (!await this.checkCooldown(command, messageWrapper, contact)) {
                return;
            }

            // Execute command
            try {
                await command.onStart({
                    message: messageWrapper,
                    args,
                    chat,
                    contact,
                    isGroup,
                    client: this.compat,
                    config: this.config,
                    prefix,
                    rateLimiter: this.rateLimiter
                });

                // Track command usage
                await trackCommand(contact.id._serialized);

                log(`✅ Command executed: ${commandName} by ${contact.name || contact.number}`, 'info');
            } catch (cmdError) {
                if (cmdError.message && cmdError.message.includes('429')) {
                    log(`⚠️ Rate limited while executing ${commandName}, queuing retry...`, 'warning');
                    await messageWrapper.reply('⏳ Too many requests. Your command will be processed shortly...');
                } else {
                    log(`❌ Error executing command ${commandName}: ${cmdError.message}`, 'error');
                    await messageWrapper.reply('❌ An error occurred while processing your command.');
                }
            }

        } catch (error) {
            log(`❌ Error handling message: ${error.message}`, 'error');
            // Try to send error message if possible (but remain silent if not whitelisted)
            try {
                const chatId = message.key.remoteJid;
                const isGroup = chatId.endsWith('@g.us');
                const senderId = message.key.participant || message.key.remoteJid;
                const wl = this.config.whiteListMode || {};
                if (wl.enabled) {
                    const whiteListUserIds = Array.isArray(wl.whiteListIds) ? wl.whiteListIds : [];
                    const whiteListedGroups = Array.isArray(wl.whiteListedGroups) ? wl.whiteListedGroups : [];

                    // Removed local getBare and normalizePair, using global normalizeJid
                    const inWhiteListUser = (id) => {
                        const normalizedId = normalizeJid(id);
                        return whiteListUserIds.some(whiteListId => normalizeJid(whiteListId) === normalizedId);
                    };
                    const ownerList = Array.isArray(this.config.adminBot) ? this.config.adminBot : [];
                    const isOwner = (() => {
                        const uid = senderId;
                        const normalizedUid = normalizeJid(uid);
                        return ownerList.some(adminId => normalizeJid(adminId) === normalizedUid);
                    })();

                    const allowedByGroup = isGroup ? whiteListedGroups.some(groupId => normalizeJid(groupId) === normalizeJid(chatId)) : false;
                    const allowedByUser = inWhiteListUser(senderId);

                    if (!(isOwner || allowedByUser || allowedByGroup)) {
                        return; // silent
                    }
                }
                await this.sock.sendMessage(chatId, { text: '❌ An error occurred while processing your command.' });
            } catch (replyError) {
                log(`❌ Failed to send error reply: ${replyError.message}`, 'error');
            }
        }
    }

    async checkPermissions(command, message, chat, contact, isGroup) {
        // Whitelist enforcement first
        const wl = this.config.whiteListMode || {};
        if (wl.enabled) {
            const userId = contact?.id?._serialized || '';
            const chatId = chat?.id?._serialized || '';
            const whiteListUserIds = Array.isArray(wl.whiteListIds) ? wl.whiteListIds : [];
            const whiteListedGroups = Array.isArray(wl.whiteListedGroups) ? wl.whiteListedGroups : [];

            // Removed local getBare and normalizePair, using global normalizeJid
            const inWhiteListUser = (id) => {
                const normalizedId = normalizeJid(id);
                return whiteListUserIds.some(whiteListId => normalizeJid(whiteListId) === normalizedId);
            };
            const ownerList = Array.isArray(this.config.adminBot) ? this.config.adminBot : [];
            const isOwner = (() => {
                const normalizedUserId = normalizeJid(userId);
                return ownerList.some(adminId => normalizeJid(adminId) === normalizedUserId);
            })();

            const allowedByGroup = isGroup ? whiteListedGroups.some(groupId => normalizeJid(groupId) === normalizeJid(chatId)) : false;
            const allowedByUser = inWhiteListUser(userId);

            if (!(isOwner || allowedByUser || allowedByGroup)) {
                // Silent block when whitelist mode is enabled
                return false;
            }
        }

        // Then role/permission checks
        const userRole = await this.getUserRole(contact, chat, isGroup);
        if (command.config.role > userRole) {
            const roleNames = ['User', 'Group Admin', 'Bot Owner'];
            await message.reply(`❌ You need ${roleNames[command.config.role]} permission to use this command.`);
            return false;
        }

        return true;
    }

    async checkCooldown(command, message, contact) {
        const cooldownKey = `${command.config.name}-${contact.id._serialized}`;
        const cooldownTime = command.config.coolDown * 1000;
        
        if (this.cooldowns.has(cooldownKey)) {
            const expirationTime = this.cooldowns.get(cooldownKey) + cooldownTime;
            
            if (Date.now() < expirationTime) {
                const timeLeft = (expirationTime - Date.now()) / 1000;
                await message.reply(`⏰ Please wait ${timeLeft.toFixed(1)} seconds before using this command again.`);
                return false;
            }
        }

        this.cooldowns.set(cooldownKey, Date.now());
        return true;
    }

    async getUserRole(contact, chat, isGroup) {
        try {
            const userId = contact?.id?._serialized || '';
            
            if (!userId) {
                log('Warning: No userId provided to getUserRole', 'warning');
                return 0;
            }

            // Normalize the user ID for consistent comparison
            const normalizedUserId = normalizeJid(userId);
            
            // Check if bot owner (highest priority)
            const isOwner = this.config.adminBot.some(adminId => {
                const normalizedAdminId = normalizeJid(adminId);
                return normalizedAdminId === normalizedUserId;
            });
            
            if (isOwner) {
                log(`User ${normalizedUserId} identified as Bot Owner`, 'info');
                return 2; // Bot Owner
            }

            // Check if group admin (only in group context)
            if (isGroup) {
                try {
                    const groupId = chat?.id?._serialized || '';
                    
                    if (!groupId) {
                        log('Warning: No groupId available for group admin check', 'warning');
                        return 0;
                    }

                    // Check cache first to avoid repeated API calls
                    let meta = this.groupCache.get(groupId);
                    
                    if (!meta) {
                        log(`Fetching group metadata for ${groupId}`, 'info');
                        meta = await this.sock.groupMetadata(groupId);
                        
                        // Cache the metadata for 5 minutes
                        this.groupCache.set(groupId, meta, 300);
                    }

                    if (!meta || !meta.participants) {
                        log(`Warning: No participants found in group metadata for ${groupId}`, 'warning');
                        return 0;
                    }

                    // Find the participant in the group
                    const participant = meta.participants.find(p => {
                        // Handle different participant ID formats
                        let pid = p.id;
                        
                        if (typeof pid === 'object') {
                            pid = pid._serialized || pid.user || pid;
                        }
                        
                        if (typeof pid === 'string') {
                            return normalizeJid(pid) === normalizedUserId;
                        }
                        
                        return false;
                    });

                    if (participant) {
                        // Check admin status
                        const adminStatus = participant.admin;
                        const isGroupAdmin = ['admin', 'superadmin'].includes(adminStatus);
                        
                        if (isGroupAdmin) {
                            log(`User ${normalizedUserId} identified as Group Admin in ${groupId}`, 'info');
                            return 1; // Group Admin
                        } else {
                            log(`User ${normalizedUserId} found in group but not admin (status: ${adminStatus})`, 'info');
                        }
                    } else {
                        log(`User ${normalizedUserId} not found in group ${groupId} participants`, 'warning');
                    }
                    
                } catch (groupError) {
                    log(`Error fetching group metadata: ${groupError.message}`, 'error');
                    
                    // Fallback: try to get participants from chat object
                    if (chat && Array.isArray(chat.participants)) {
                        const participant = chat.participants.find(p => {
                            const pid = typeof p.id === 'string' ? p.id : p.id?._serialized;
                            return normalizeJid(pid) === normalizedUserId;
                        });
                        
                        if (participant && ['admin', 'superadmin'].includes(participant.admin)) {
                            log(`User ${normalizedUserId} identified as Group Admin (fallback method)`, 'info');
                            return 1;
                        }
                    }
                }
            }

            // Default to regular user
            log(`User ${normalizedUserId} identified as Regular User`, 'info');
            return 0; // Regular user
            
        } catch (error) {
            log(`Error in getUserRole for user ${contact?.id?._serialized}: ${error.message}`, 'error');
            return 0; // Default to regular user on error
        }
    }

    async getEffectivePrefix(chatId) {
        try {
            const dbPath = path.join(__dirname, 'data', 'chat-prefixes.json');
            
            if (await fsExtra.pathExists(dbPath)) {
                const data = await fsExtra.readJSON(dbPath);
                return data[chatId] || this.config.bot.prefix;
            }
            return this.config.bot.prefix;
        } catch (error) {
            log(`⚠️ Error getting effective prefix: ${error.message}`, 'warning');
            return this.config.bot.prefix;
        }
    }

    async loadCommands() {
        const startTime = Date.now();
        const commands = await loadCommands();
        this.commands = commands;
        const loadTime = Date.now() - startTime;
        
        log(`📋 Loaded ${commands.size} commands in ${loadTime}ms`, 'info');
        return commands.size;
    }

    async loadEvents() {
        const startTime = Date.now();
        const events = await loadEvents();
        this.events = events;
        const loadTime = Date.now() - startTime;
        
        log(`🎉 Loaded ${events.size} events in ${loadTime}ms`, 'info');
        return events.size;
    }

    setupDashboard() {
        if (!this.config.dashBoard.enabled) return;

        try {
            this.webDashboard = new WebDashboard(this.config.dashBoard.port || 3000);
            this.webDashboard.initialize(() => this.getDashboardData());
            
            log(`📊 Dashboard available at http://localhost:${this.config.dashBoard.port || 3000}`, 'info');
            log(`📱 Open your browser to see QR code for WhatsApp authentication`, 'info');
        } catch (error) {
            log(`⚠️ Failed to setup dashboard: ${error.message}`, 'warning');
            this.webDashboard = null;
        }
    }

    setupAutoTasks() {
        // Setup automated tasks using cron
        if (this.config.autoTasks && this.config.autoTasks.enabled) {
            log('⏰ Setting up automated tasks...', 'info');
            
            // Example: Daily restart at specified time (if configured)
            if (this.config.autoTasks.dailyRestart) {
                const time = this.config.autoTasks.dailyRestartTime || '03:00';
                cron.schedule(time, () => {
                    log('🔄 Performing scheduled daily restart...', 'info');
                    process.exit(0); // Clean exit for process manager to restart
                });
                log(`📅 Scheduled daily restart at ${time}`, 'info');
            }
            
            // Add other automated tasks here as needed
        }
    }

    getDashboardData() {
        const rateLimiterStats = this.rateLimiter.getStats();
        return {
            status: this.authenticated ? '🟢 Connected' : '🔴 Disconnected',
            uptime: formatUptime(Date.now() - this.startTime),
            commandCount: this.commands.size,
            isAuthenticated: this.isAuthenticated,
            rateLimiter: {
                queuedRequests: rateLimiterStats.queuedRequests,
                activeRequests: rateLimiterStats.activeRequests,
                isProcessing: rateLimiterStats.isProcessing
            }
        };
    }
    
    async checkRestartNotification() {
        try {
            const restartCommand = this.commands.get('restart');
            if (restartCommand && typeof restartCommand.checkRestart === 'function') {
                await restartCommand.checkRestart(this.compat);
            }
        } catch (error) {
            log(`⚠️ Error checking restart notification: ${error.message}`, 'warning');
        }
    }
}

// Initialize and start the bot
const bot = new WhatsAppBot();
bot.initialize();
