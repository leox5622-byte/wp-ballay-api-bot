const fs = require("fs-extra");
const path = require("path");
 
module.exports = {
	config: {
		name: "restart",
		version: "1.1",
		author: "NTKhang",
		countDown: 5,
		role: 2,
		description: {
			vi: "Khởi động lại bot",
			en: "Restart bot"
		},
		category: "Owner",
		guide: {
			vi: "   {pn}: Khởi động lại bot",
			en: "   {pn}: Restart bot"
		}
	},
 
	langs: {
		vi: {
			restartting: "🔄 | Đang khởi động lại bot..."
		},
		en: {
			restartting: "🔄 | Restarting bot..."
		}
	},
 
	onLoad: function ({ api }) {
		const pathFile = `${__dirname}/tmp/restart.txt`;
		if (fs.existsSync(pathFile)) {
			try {
				const fileContent = fs.readFileSync(pathFile, "utf-8").trim();
				let tid, time;
				
				// Try to parse as JSON first (new format)
				try {
					const data = JSON.parse(fileContent);
					tid = data.chatId;
					time = data.timestamp;
				} catch {
					// Fallback to old space-separated format
					[tid, time] = fileContent.split(" ");
				}
				
				if (tid && time) {
					const restartTime = ((Date.now() - parseInt(time)) / 1000).toFixed(2);
					api.sendMessage(`✅ | Bot restarted\n⏰ | Time: ${restartTime}s`, tid);
				}
				fs.unlinkSync(pathFile);
			} catch (error) {
				console.error('Error processing restart file:', error);
				fs.unlinkSync(pathFile); // Clean up corrupted file
			}
		}
	},
 
	onStart: async function ({ message, event, getLang }) {
		const pathFile = `${__dirname}/tmp/restart.txt`;
		// Ensure directory exists before writing
		fs.ensureDirSync(path.dirname(pathFile));
		const restartData = {
			chatId: event?.key?.remoteJid || event?.threadID || event?.chatId || event?.from || "unknown",
			userId: event?.key?.participant || event?.senderID || event?.author || event?.participant || "unknown",
			userName: event?.pushName || event?.senderName || "Unknown",
			timestamp: Date.now(),
			reason: "Manual restart"
		};
		fs.writeFileSync(pathFile, JSON.stringify(restartData, null, 2));
		await message.reply(getLang("restartting"));
		process.exit(2);
	}
};