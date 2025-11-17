const { getUserData, updateUserData, log } = require('../scripts/helpers');

module.exports = {
    config: {
        name: "send",
        aliases: ["transfer", "pay"],
        version: "1.0",
        author: "Assistant",
        coolDown: 10,
        role: 0,
        description: "Transfer coins to another user",
        category: "economy",
        guide: {
            en: "{prefix}send @mention <amount> - Send coins to mentioned user"
        }
    },

    onStart: async function({ message, args, client, prefix, config, chat, contact }) {
        try {
            const mentions = message.mentionedIds || [];
            const senderId = message.author || message.from;

            if (mentions.length === 0) {
                return await message.reply("❌ Please mention a user to transfer coins to.\n\nUsage: !transfer @user <amount>");
            }

            if (mentions.includes(senderId)) {
                return await message.reply("❌ You cannot transfer coins to yourself!");
            }

            const amount = parseInt(args[args.length - 1]);
            if (isNaN(amount) || amount <= 0) {
                return await message.reply("❌ Please specify a valid amount to transfer.\n\nUsage: !transfer @user <amount>");
            }

            if (amount < 10) {
                return await message.reply("❌ Minimum transfer amount is 10 coins.");
            }

            const senderData = await getUserData(senderId);
            const receiverId = mentions[0];
            const receiverData = await getUserData(receiverId);

            if (senderData.coins < amount) {
                return await message.reply(`❌ Insufficient balance! You have ${senderData.coins} coins but need ${amount} coins.`);
            }

            // Perform transfer
            await updateUserData(senderId, {
                coins: senderData.coins - amount,
                lastActive: Date.now()
            });

            await updateUserData(receiverId, {
                coins: receiverData.coins + amount,
                lastActive: Date.now()
            });

            // Get receiver's name
            let receiverName = "Unknown User";
            try {
                const contact = await client.getContactById(receiverId);
                receiverName = contact.name || contact.number || "Unknown User";
            } catch (error) {
                receiverName = receiverId.split('@')[0];
            }

            const successMessage = `✅ **Transfer Successful!**\n\n` +
                `💸 Sent: ${amount} coins\n` +
                `👤 To: ${receiverName}\n` +
                `💰 Your Balance: ${senderData.coins - amount} coins`;

            await message.reply(successMessage);
            log(`Transfer: ${senderId} sent ${amount} coins to ${receiverId}`, 'info');

        } catch (error) {
            log(`Error in transfer command: ${error.message}`, 'error');
            await message.reply("❌ An error occurred during the transfer. Please try again later.");
        }
    }
};