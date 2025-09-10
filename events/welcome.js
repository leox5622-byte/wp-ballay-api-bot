const { getGroupData } = require('../scripts/helpers');

if (!global.temp) global.temp = {};
if (!global.temp.welcomeEvent) global.temp.welcomeEvent = {};

module.exports = {
    config: {
        name: "welcome",
        version: "1.7",
        author: "NTKhang - Adapted for WhatsApp",
        description: "Welcome new members to group",
        category: "events"
    },

    langs: {
        vi: {
            session1: "sáng",
            session2: "trưa",
            session3: "chiều",
            session4: "tối",
            welcomeMessage: "Cảm ơn bạn đã thêm tôi vào nhóm!\nPrefix bot: %1\nĐể xem danh sách lệnh hãy nhập: %1help",
            multiple1: "bạn",
            multiple2: "các bạn",
            defaultWelcomeMessage: "Xin chào @{userName}.\nChào mừng {multiple} đến với *{groupName}*.\nChúc {multiple} có buổi {session} vui vẻ! 😊"
        },
        en: {
            session1: "morning",
            session2: "noon",
            session3: "afternoon",
            session4: "evening",
            welcomeMessage: "Thank you for adding me to the group!\nBot prefix: %1\nTo view the list of commands, please enter: %1help",
            multiple1: "you",
            multiple2: "you all",
            defaultWelcomeMessage: `𝗔𝗦𝗦𝗔𝗟𝗔𝗠𝗨𝗟𝗔𝗜𝗞𝗨𝗠🥰\n\n🎀> @{userName}.\n𝗪𝗲𝗹𝗰𝗼𝗺𝗲 𝘆𝗼𝘂 𝘁𝗼 𝗼𝘂𝗿 *{groupName}*\n⚠ 𝗜 𝗵𝗼𝗽𝗲 𝘆𝗼𝘂 𝘄𝗶𝗹𝗹 𝗳𝗼𝗹𝗹𝗼𝘄 𝗼𝘂𝗿 𝗮𝗹𝗹 𝗴𝗿𝗼𝗨𝗣 𝗿𝘂𝗹𝗲𝘀♻`
        }
    },

    // This function will be called when the bot is added to a group
    onBotAdded: async function(client, chat) {
        try {
            const config = require('../config.json');
            const prefix = config.bot.prefix;
            const lang = config.bot.defaultLang || 'en';
            
            const welcomeMsg = this.langs[lang].welcomeMessage.replace('%1', prefix);
            // Use client.sendMessage for compatibility
            await client.sendMessage(chat.id?._serialized || chat.id || chat, welcomeMsg);
            
        } catch (error) {
            console.error('Error in onBotAdded:', error);
        }
    },

    // This function will be called when new members join
    onMembersAdded: async function(client, notification) {
        try {
            const chat = await client.getChatById(notification.chatId);
            const config = require('../config.json');
            const lang = config.bot.defaultLang || 'en';
            
            if (!chat.isGroup) return;
            
            // Get group data to check if welcome is enabled
            const groupData = await getGroupData(notification.chatId);
            if (groupData.settings && groupData.settings.welcomeDisabled) return;
            
            const groupId = notification.chatId;
            
            // Initialize welcome event data for this group
            if (!global.temp.welcomeEvent[groupId]) {
                global.temp.welcomeEvent[groupId] = {
                    joinTimeout: null,
                    addedParticipants: []
                };
            }
            
            // Get new members info
            const newMembers = [];
            const recipients = notification.participants || notification.recipientIds || [];
            for (const participantId of recipients) {
                try {
                    const contact = await client.getContactById(participantId);
                    newMembers.push({
                        id: participantId,
                        name: contact.name || contact.pushname || contact.number || participantId.split('@')[0],
                        mention: participantId
                    });
                } catch (error) {
                    // Fallback if contact info cannot be retrieved
                    newMembers.push({
                        id: participantId,
                        name: participantId.split('@')[0],
                        mention: participantId
                    });
                }
            }
            
            // Add new members to the queue
            global.temp.welcomeEvent[groupId].addedParticipants.push(...newMembers);
            
            // Clear existing timeout
            if (global.temp.welcomeEvent[groupId].joinTimeout) {
                clearTimeout(global.temp.welcomeEvent[groupId].joinTimeout);
            }
            
            // Set timeout to send welcome message (allows for batching multiple joins)
            global.temp.welcomeEvent[groupId].joinTimeout = setTimeout(async () => {
                try {
                    const addedParticipants = global.temp.welcomeEvent[groupId].addedParticipants;
                    
                    if (addedParticipants.length === 0) return;
                    
                    // Get current time for session greeting
                    const now = new Date();
                    const hours = now.getHours();
                    let session;
                    
                    if (hours <= 10) {
                        session = this.langs[lang].session1; // morning
                    } else if (hours <= 12) {
                        session = this.langs[lang].session2; // noon
                    } else if (hours <= 18) {
                        session = this.langs[lang].session3; // afternoon
                    } else {
                        session = this.langs[lang].session4; // evening
                    }
                    
                    // Determine if multiple users
                    const multiple = addedParticipants.length > 1;
                    const multipleText = multiple ? this.langs[lang].multiple2 : this.langs[lang].multiple1;
                    
                    // Get group name
                    const groupName = chat.name || 'this group';
                    
                    // Create user names list
                    const userNames = addedParticipants.map(member => member.name).join(', ');
                    
                    // Get custom welcome message or use default
                    let welcomeMessage = groupData.settings?.welcomeMessage || this.langs[lang].defaultWelcomeMessage;
                    
                    // Replace placeholders
                    welcomeMessage = welcomeMessage
                        .replace(/\{userName\}/g, userNames)
                        .replace(/\{groupName\}/g, groupName)
                        .replace(/\{multiple\}/g, multipleText)
                        .replace(/\{session\}/g, session);
                    
                    // Create mentions for WhatsApp
                    const mentions = addedParticipants.map(member => member.mention);
                    
                    // Send welcome message using client for compatibility
                    await client.sendMessage(groupId, { text: welcomeMessage, mentions });
                    
                    // Clean up
                    delete global.temp.welcomeEvent[groupId];
                    
                } catch (error) {
                    console.error('Error sending welcome message:', error);
                    // Clean up even if there's an error
                    delete global.temp.welcomeEvent[groupId];
                }
            }, 1500); // 1.5 second delay to allow for batching
            
        } catch (error) {
            console.error('Error in welcome event:', error);
        }
    },

    // Legacy execute function for compatibility
    execute: async function(client, notification) {
        await this.onMembersAdded(client, notification);
    },

    // Utility function to get session greeting
    getSessionGreeting: function(lang = 'en') {
        const hours = new Date().getHours();
        
        if (hours <= 10) {
            return this.langs[lang].session1; // morning
        } else if (hours <= 12) {
            return this.langs[lang].session2; // noon
        } else if (hours <= 18) {
            return this.langs[lang].session3; // afternoon
        } else {
            return this.langs[lang].session4; // evening
        }
    }
};
