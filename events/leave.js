const { getGroupData } = require('../scripts/helpers');

module.exports = {
    config: {
        name: "leave",
        version: "1.0.1",
        author: "Bot Team",
        description: "Handle user leaving group"
    },
    
    langs: {
        en: {
            goodbye: "👋 Goodbye *{userName}*!\n\nWe'll miss you! Hope to see you again soon. 💙"
        }
    },
    
    execute: async function(client, notification) {
        try {
            const chat = await client.getChatById(notification.chatId);
            const participants = notification.participants || notification.recipientIds || [];
            const userId = participants[0];
            const contact = await client.getContactById(userId);
            
            if (!chat.isGroup) return;
            
            const groupData = await getGroupData(notification.chatId);
            
            // Check if goodbye message is enabled for this group
            if (groupData.settings && groupData.settings.goodbyeDisabled) return;
            
            const displayName = contact.name || contact.pushname || contact.number || userId.split('@')[0];
            const goodbyeMessage = `👋 Goodbye *${displayName}*!\n\nWe'll miss you! Hope to see you again soon. 💙`;
            
            await client.sendMessage(notification.chatId, { text: goodbyeMessage });
            
        } catch (error) {
            console.error('Error in leave event:', error);
        }
    }
};