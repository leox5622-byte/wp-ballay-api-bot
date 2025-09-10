// Author: Rahaman Leon
// Command: 4k
// Description: Upscale images to 4K using AI

const axios = require("axios");
const { MessageMedia } = require("../scripts/messageMedia");

module.exports = {
  config: {
    name: "4k",
    aliases: ["upscale", "enhance", "hd"],
    version: "1.3",
    author: "xx",
    coolDown: 30,
    role: 0,
    description: "Upscale images to 4K resolution using AI",
    category: "image",
    guide: {
      en: "Reply to an image with {prefix}4k to upscale it"
    }
  },

  onStart: async function ({ message, client }) {
    try {
      if (!message.hasQuotedMsg) {
        return message.reply(
          "❌ *Reply to an image to upscale it!*\n\n" +
          "💡 *Usage:*\n• Reply to an image\n• Type `!4k`\n\n" +
          "📂 JPG, PNG, WebP supported (Max: 5MB)"
        );
      }

      const quoted = await message.getQuotedMessage();
      if (!quoted.hasMedia) {
        return message.reply("❌ That message has no image.");
      }

      const media = await quoted.downloadMedia();
      if (!media || !media.mimetype.startsWith("image/")) {
        return message.reply("❌ Only image files are supported (JPG, PNG, WebP).");
      }

      const buffer = Buffer.from(media.data, "base64");
      const sizeMB = buffer.length / (1024 * 1024);

      if (sizeMB > 5) {
        return message.reply(
          `❌ Image too large: ${sizeMB.toFixed(1)}MB\n` +
          "📏 Limit: 5MB\n💡 Compress and try again."
        );
      }

      const processing = await message.reply("🔄 Upscaling image to 4K... Please wait.");

      const imageUrl = await uploadImage(media.data, media.mimetype);
      const upscaleUrl = `https://smfahim.xyz/4k?url=${encodeURIComponent(imageUrl)}`;

      const res = await axios.get(upscaleUrl, { timeout: 120000 });
      if (!res.data?.image) throw new Error("Invalid response from 4K API.");

      const enhanced = await axios.get(res.data.image, {
        responseType: "arraybuffer",
        timeout: 60000
      });

      const mediaOut = new MessageMedia("image/png", Buffer.from(enhanced.data).toString("base64"), "upscaled.png");
      await client.sendMessage(message.from, mediaOut, {
        caption: "✨ *4K Image Ready!* 🚀\n\nEnhanced by AI.\n🔧 Powered by SmFahim API"
      });

      await processing.delete();

    } catch (error) {
      await handleError(message, error);
    }
  }
};

// -------------------- UPLOAD FALLBACKS --------------------

async function uploadImage(base64, mimetype) {
  const methods = [
    () => toTelegraph(base64, mimetype),
    () => toFreeImageHost(base64),
    () => toImgur(base64)
  ];

  for (let i = 0; i < methods.length; i++) {
    try {
      const url = await methods[i]();
      return url;
    } catch (err) {
      if (i === methods.length - 1) throw new Error("Image upload failed");
    }
  }
}

async function toTelegraph(base64, mimetype) {
  const FormData = require("form-data");
  const form = new FormData();

  const ext = mimetype.split("/")[1] || "jpg";
  const buffer = Buffer.from(base64, "base64");
  form.append("file", buffer, { filename: `image.${ext}`, contentType: mimetype });

  const res = await axios.post("https://telegra.ph/upload", form, {
    headers: form.getHeaders(),
    timeout: 30000
  });

  if (!res.data?.[0]?.src) throw new Error("Telegraph failed");
  return "https://telegra.ph" + res.data[0].src;
}

async function toFreeImageHost(base64) {
  const FormData = require("form-data");
  const form = new FormData();
  form.append("source", Buffer.from(base64, "base64"), "image.jpg");
  form.append("type", "file");
  form.append("action", "upload");

  const res = await axios.post("https://freeimage.host/api/1/upload", form, {
    headers: form.getHeaders(),
    timeout: 30000
  });

  if (res.data?.success?.code !== 200 || !res.data?.image?.url) {
    throw new Error("FreeImageHost failed");
  }

  return res.data.image.url;
}

async function toImgur(base64) {
  const res = await axios.post("https://api.imgur.com/3/image", {
    image: base64.replace(/^data:image\/[a-z]+;base64,/, ""),
    type: "base64"
  }, {
    headers: {
      Authorization: "Client-ID 546c25a59c58ad7"
    },
    timeout: 30000
  });

  if (!res.data?.success || !res.data?.data?.link) throw new Error("Imgur failed");
  return res.data.data.link;
}

// -------------------- ERROR HANDLER --------------------

async function handleError(message, error) {
  let msg = "❌ *Image upscaling failed*\n\n";

  if (error.code === "ECONNABORTED") {
    msg += "⏱️ *Timeout*: Try smaller image";
  } else if (error.message.includes("upload")) {
    msg += "📤 *Image upload failed*: Try again";
  } else if (error.response?.status === 429) {
    msg += "🚫 *Rate limited*: Wait before retrying";
  } else if (error.response?.status >= 500) {
    msg += "🔧 *Server issue*: Try later";
  } else {
    msg += `🐞 *Error*: ${error.message}`;
  }

  msg += "\n\n📋 *Tips:*\n• Use JPG/PNG\n• <5MB\n• Clear, high-quality input";

  await message.reply(msg);
}
