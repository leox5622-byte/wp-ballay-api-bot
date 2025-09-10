const { getUserData, updateUserData } = require('../scripts/helpers');

module.exports = {
    config: {
        name: "message",
        version: "1.0.0",
        author: "Bot Team",
        description: "Handle all incoming messages"
    },
    
    execute: async function(client, message, { chat, contact, isGroup }) {
        try {
            // Update user activity and award XP
            const userId = contact.id._serialized;
            const userData = await getUserData(userId);
            
            // Award XP for each message (1-3 XP per message)
            const xpGain = Math.floor(Math.random() * 3) + 1; // Random 1-3 XP
            const newExp = (userData.exp || 0) + xpGain;
            const currentLevel = userData.level || 1;
            
            // Calculate new level (100 XP per level)
            const newLevel = Math.floor(newExp / 100) + 1;
            const leveledUp = newLevel > currentLevel;
            
            await updateUserData(userId, {
                lastActive: Date.now(),
                messageCount: (userData.messageCount || 0) + 1,
                exp: newExp,
                level: newLevel,
                coins: leveledUp ? (userData.coins || 0) + (newLevel * 10) : userData.coins || 0 // Bonus coins for leveling up
            });
            
            // Notify user about level up
            if (leveledUp && !isGroup) { // Only send level up message in DM to avoid spam in groups
                setTimeout(async () => {
                    try {
                        await message.reply(`🎉 **Level Up!**\n\n🔸 **New Level:** ${newLevel}\n🔸 **Total XP:** ${newExp}\n🔸 **Bonus Coins:** ${newLevel * 10}\n\nKeep chatting to level up more! 🚀`);
                    } catch (err) {
                        console.error('Error sending level up message:', err);
                    }
                }, 1000);
            }
            
            // Auto-react to certain messages (optional)
            if (message.body.toLowerCase().includes('bot')) {
                await message.react('🤖');
            }
            
            // Log message activity (with XP info)
            const config = require('../config.json');
            if (config.logEvents && config.logEvents.message) {
                console.log(`📝 Message from ${contact.name || contact.number}: +${xpGain} XP (Total: ${newExp})`);
            }
            
        } catch (error) {
            console.error('Error in message event:', error);
        }
    }
};