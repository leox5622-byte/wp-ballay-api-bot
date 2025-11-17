const axios = require("axios");
const { MessageMedia } = require("../scripts/messageMedia");
const moment = require('moment-timezone');

let cachedApiUrl = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const baseApiUrl = async () => {
    const now = Date.now();
    if (cachedApiUrl && (now - cacheTimestamp) < CACHE_DURATION) return cachedApiUrl;

    try {
        const res = await axios.get("https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json", {
            timeout: 10000,
            headers: { 'User-Agent': 'Pinterest-Bot/1.1' }
        });
        if (!res.data || !res.data.api) throw new Error("Invalid API URL response");
        cachedApiUrl = res.data.api;
        cacheTimestamp = now;
        return cachedApiUrl;
    } catch (e) {
        if (cachedApiUrl) return cachedApiUrl;
        throw new Error("Unable to retrieve API URL");
    }
};

module.exports = {
    config: {
        name: "pin",
        aliases: ["pinterest"],
        version: "1.3",
        author: "Rahaman Leon",
        description: "Search and send Pinterest images in batch",
        usage: "pin <query> - <amount>",
        category: "image",
        coolDown: 10,
        role: 0,
        guide: { en: `Usage: {prefix}pin <search term> - <number>\nExample: {prefix}pin cats - 3` }
    },

    onStart: async function ({ message, args, client, prefix }) {
        if (!args || args.length === 0) return this.sendUsageMessage(client, message, prefix);
        const parsed = this.parseInput(args.join(" ").trim());
        if (!parsed) return this.sendUsageMessage(client, message, prefix);

        const { query, amount } = parsed;
        const maxAllowed = 10;
        if (amount > maxAllowed) return await client.sendMessage(message.from, `⚠️ Max ${maxAllowed} images. Requested: ${amount}`);

        let loadingMsg;
        try {
            loadingMsg = await client.sendMessage(message.from, `🔍 Searching Pinterest for "${query}"\n📦 Requested Images: ${amount}\n⏳ Please wait...`);
        } catch {}

        try {
            const images = await this.fetchImages(query, amount);
            if (!images || images.length === 0) {
                if (loadingMsg) await this.deleteMessage(loadingMsg);
                return client.sendMessage(message.from, `❌ No images found for "${query}"`);
            }

            // Fetch images as buffers
            const mediaBuffers = await Promise.all(images.map(async (url, idx) => {
                const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
                return { buffer: Buffer.from(response.data), caption: `📌 Pinterest Image ${idx + 1}/${images.length}\n🔍 Search: "${query}"` };
            }));

            // Send all images sequentially
            for (const media of mediaBuffers) {
                await client.sendMessage(message.from, { image: media.buffer, caption: media.caption });
            }

            if (loadingMsg) await this.deleteMessage(loadingMsg);
            await client.sendMessage(message.from, `✅ Successfully sent ${mediaBuffers.length} image(s) for "${query}"`);

        } catch (e) {
            if (loadingMsg) await this.deleteMessage(loadingMsg);
            await client.sendMessage(message.from, `❌ Error: ${e.message}`);
        }
    },

    parseInput: function(input) {
        const parts = input.split("-");
        if (parts.length !== 2) return null;
        const query = parts[0].trim();
        const amount = parseInt(parts[1].trim());
        if (!query || isNaN(amount) || amount < 1 || amount > 50) return null;
        return { query, amount };
    },

    fetchImages: async function(query, amount) {
        const apiUrl = await baseApiUrl();
        const res = await axios.get(`${apiUrl}/pinterest?search=${encodeURIComponent(query)}&limit=${encodeURIComponent(amount)}`, {
            timeout: 30000,
            headers: { 'User-Agent': 'Pinterest-Bot/1.1', 'Accept': 'application/json' }
        });
        if (!res.data || !res.data.data) throw new Error("Invalid API response");
        return res.data.data.filter(url => typeof url === 'string' && url.trim() !== '');
    },

    sendUsageMessage: function(client, message, prefix) {
        return client.sendMessage(message.from, `❌ Wrong format!\nUsage: ${prefix}pin <query> - <amount>\nMax 10 images.`);
    },

    deleteMessage: async function(msgObj) {
        try { if (msgObj?.delete) await msgObj.delete(true); } catch {}
    }
};
