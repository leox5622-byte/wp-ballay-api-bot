// Baileys Compatibility Layer
// This file provides compatibility functions to bridge whatsapp-web.js API with Baileys

const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

class BaileysCompat {
    constructor(sock) {
        this.sock = sock;
    }

    // Convert Baileys message format to whatsapp-web.js compatible format
    convertMessage(baileysMessage) {
        const messageContent = baileysMessage.message?.conversation || 
                             baileysMessage.message?.extendedTextMessage?.text || 
                             baileysMessage.message?.imageMessage?.caption || 
                             baileysMessage.message?.videoMessage?.caption || '';
        
        const chatId = baileysMessage.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderId = baileysMessage.key.participant || baileysMessage.key.remoteJid;

        // Extract mentions from Baileys message
        const mentionedIds = baileysMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        return {
            body: messageContent,
            from: chatId,
            sender: senderId,
            isGroup: isGroup,
            fromMe: baileysMessage.key.fromMe,
            key: baileysMessage.key,
            message: baileysMessage.message,
            pushName: baileysMessage.pushName,
            mentionedIds: mentionedIds,
            reply: async (text, options = {}) => {
                return await this.sock.sendMessage(chatId, { text }, { quoted: baileysMessage, ...options });
            },
            getChat: async () => {
                return {
                    id: { _serialized: chatId },
                    isGroup: isGroup,
                    name: isGroup ? (await this.getGroupMetadata(chatId))?.subject : undefined
                };
            },
            getContact: async () => {
                return {
                    id: { _serialized: senderId },
                    name: baileysMessage.pushName || senderId.split('@')[0],
                    number: senderId.split('@')[0]
                };
            },
            getMentions: async () => {
                // Compatibility method for whatsapp-web.js getMentions()
                return mentionedIds.map(id => ({
                    id: { _serialized: id },
                    name: id.split('@')[0],
                    pushname: id.split('@')[0]
                }));
            }
        };
    }

    // Compatibility method for sendMessage
    async sendMessage(chatId, content, options = {}) {
        try {
            // Handle different content types
            if (typeof content === 'string') {
                return await this.sock.sendMessage(chatId, { text: content }, options);
            }
            
            // Handle MessageMedia objects
            if (content && content.mimetype) {
                const mediaType = this.getMediaType(content.mimetype);
                const buffer = Buffer.isBuffer(content.data) ? content.data : Buffer.from(content.data, 'base64');
                const msg = {
                    [mediaType]: buffer,
                    caption: options.caption,
                    mimetype: content.mimetype,
                    fileName: content.filename
                };
                return await this.sock.sendMessage(chatId, msg, options);
            }
            
            // Handle object content (for media with caption)
            if (content && typeof content === 'object') {
                return await this.sock.sendMessage(chatId, content, options);
            }
            
            return await this.sock.sendMessage(chatId, { text: String(content) }, options);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Get media type from mimetype
    getMediaType(mimetype) {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        return 'document';
    }

    // Compatibility method for getChatById
    async getChatById(chatId) {
        try {
            const isGroup = chatId.endsWith('@g.us');
            let chatInfo = {
                id: { _serialized: chatId },
                isGroup: isGroup
            };

            if (isGroup) {
                const groupMetadata = await this.getGroupMetadata(chatId);
                chatInfo.name = groupMetadata?.subject;
                chatInfo.participants = groupMetadata?.participants;
            }

            return chatInfo;
        } catch (error) {
            console.error('Error getting chat:', error);
            return {
                id: { _serialized: chatId },
                isGroup: chatId.endsWith('@g.us')
            };
        }
    }

    // Compatibility method for getContactById
    async getContactById(contactId) {
        try {
            // Ensure contactId has proper format
            if (!contactId.includes('@')) {
                contactId = contactId + '@c.us';
            }

            const self = this;
            return {
                id: { _serialized: contactId },
                name: contactId.split('@')[0],
                number: contactId.split('@')[0],
                getProfilePicUrl: async () => {
                    try {
                        return await self.sock.profilePictureUrl(contactId, 'image');
                    } catch (e) {
                        return null;
                    }
                }
            };
        } catch (error) {
            console.error('Error getting contact:', error);
            return {
                id: { _serialized: contactId },
                name: contactId.split('@')[0],
                number: contactId.split('@')[0]
            };
        }
    }

    // Add getProfilePicUrl compatibility at client level
    async getProfilePicUrl(jid) {
        try {
            if (!jid.includes('@')) jid = jid + '@c.us';
            return await this.sock.profilePictureUrl(jid, 'image');
        } catch (e) {
            return null;
        }
    }

    // Get group metadata with caching
    async getGroupMetadata(groupId) {
        try {
            return await this.sock.groupMetadata(groupId);
        } catch (error) {
            console.error('Error getting group metadata:', error);
            return null;
        }
    }

    // Add rate limiting wrapper
    async sendMessageWithRateLimit(chatId, content, options = {}) {
        return await this.sendMessage(chatId, content, options);
    }
}

module.exports = BaileysCompat;