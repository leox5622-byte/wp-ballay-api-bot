const Jimp = require("jimp");

module.exports = {
	config: {
		name: "arrest",
		aliases: ["arrest"],
		version: "1.1",
		author: "milan-says, refactor by Trae AI",
		countDown: 5,
		role: 0,
		shortDescription: "Create an arrest edit using two profile photos",
		longDescription: "Generate an arrest meme by compositing two users' profile pictures onto a template.",
		category: "image",
		guide: {
			vi: "{pn} [@tag]",
			en: "{pn} [@mention or reply to a user]"
		}
	},

	onStart: async function ({ message, client }) {
		try {
			const { one, two } = await resolvePair(message);
			if (!one || !two)
				return await client.sendMessage(message.from, "Please mention someone or reply to a user's message.");

			// Get profile picture URLs (fallback to default avatar if none)
			const [url1, url2] = await Promise.all([
				client.getProfilePicUrl(one).catch(() => null),
				client.getProfilePicUrl(two).catch(() => null)
			]);

			const avatar1 = await makeCircularAvatar(url1 || defaultAvatar(one), 100);
			const avatar2 = await makeCircularAvatar(url2 || defaultAvatar(two), 100);

			// Base template
			const base = await Jimp.read("https://i.imgur.com/ep1gG3r.png");
			base.resize(500, 500)
				.composite(avatar1, 375, 9)
				.composite(avatar2, 160, 92);

			const buffer = await base.getBufferAsync(Jimp.MIME_PNG);
			await client.sendMessage(message.from, { image: buffer, caption: "You are under arrest" });
		}
		catch (err) {
			console.error("arrest command error:", err);
			await client.sendMessage(message.from, "❌ Failed to create arrest image. Please try again later.");
		}
	}
};

async function resolvePair(message) {
	const ctx = message?.message?.extendedTextMessage?.contextInfo || {};
	const mentioned = message.mentionedIds || ctx.mentionedJid || [];
	const sender = message?.sender;

	if (mentioned.length === 0 && !ctx.participant) {
		return { one: null, two: null };
	}
	if (mentioned.length >= 2) {
		return { one: mentioned[1], two: mentioned[0] };
	}
	if (mentioned.length === 1) {
		return { one: sender, two: mentioned[0] };
	}
	// Fallback: reply target
	if (ctx.participant) {
		return { one: sender, two: ctx.participant };
	}
	return { one: null, two: null };
}

async function makeCircularAvatar(url, size) {
	const img = await Jimp.read(url);
	img.circle();
	return img.resize(size, size);
}

function defaultAvatar(id) {
	const seed = encodeURIComponent(String(id || '').split('@')[0]);
	return `https://api.dicebear.com/7.x/initials/png?seed=${seed}&backgroundColor=b6e3f4&textColor=ffffff`;
}