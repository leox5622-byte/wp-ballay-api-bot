const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { MessageMedia } = require("../scripts/messageMedia");
const moment = require('moment-timezone');

const tmpDir = path.join(__dirname, "tmp");

module.exports = {
  config: {
    name: "catsay",
    aliases: ["meowsay", "cattext", "meow"],
    version: "1.2",
    author: "SaikiDesu",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Generate a cat image with your text" },
    longDescription: { 
      en: "Creates a cute cat image with your input text using cataas.com. Supports custom colors, sizes, and filters!" 
    },
    category: "edit-img",
    guide: { 
      en: `{p}catsay <text>
      
Advanced usage:
• {p}catsay Hello World
• {p}catsay --color=blue Hello World
• {p}catsay --size=large Good Morning!
• {p}catsay --filter=vintage Happy Day!

Available colors: blue, red, green, yellow, orange, purple, pink, black, white, gray, brown
Available sizes: small, medium, large
Available filters: blur, mono, sepia, negative, paint, pixel, vintage` 
    },
  },

  onStart: async function({ client, message, args }) {
    // Validate input early
    if (!args || args.length === 0) {
      return message.reply(`❌ Please provide text for the cat to say.
      
📝 Usage: ${this.config.guide.en}`);
    }

    // Parse arguments for text and options
    const { text, options } = this.parseArgs(args);
    
    if (!text || text.trim() === '') {
      return message.reply(`❌ Please provide text for the cat to say.
      
📝 Usage: ${this.config.guide.en}`);
    }

    // Validate text length
    if (text.length > 100) {
      return message.reply("❌ Text too long! Please keep it under 100 characters.");
    }

    // Sanitize text for safety
    const sanitizedText = this.sanitizeText(text);
    if (!sanitizedText) {
      return message.reply("❌ Invalid text provided. Please use alphanumeric characters and basic punctuation only.");
    }

    let tmpFile;
    
    try {
      // Send typing indicator (if supported)
      try {
        await message.getChat().then(chat => chat.sendStateTyping());
      } catch (e) {
        // Ignore if not supported
      }
      
      // Ensure tmp directory exists
      await fs.ensureDir(tmpDir);
      
      // Generate unique filename to avoid conflicts
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const userId = message.from.replace(/@[cg]\.us$/, '').replace(/[^a-zA-Z0-9]/g, '');
      tmpFile = path.join(tmpDir, `cat_${userId}_${timestamp}_${randomId}.png`);
      
      // Build API URL with options
      const apiUrl = this.buildApiUrl(sanitizedText, options);
      console.log(`🐱 Fetching cat image: ${apiUrl}`);
      
      // Download image with improved error handling
      const response = await this.downloadImage(apiUrl);

      // Save image to temporary file
      await fs.writeFile(tmpFile, response.data);
      
      // Verify file was created and has content
      const stats = await fs.stat(tmpFile);
      if (stats.size === 0) {
        throw new Error("Generated file is empty");
      }

      // Validate file size (max 5MB for WhatsApp)
      if (stats.size > 5 * 1024 * 1024) {
        throw new Error("Generated image is too large");
      }

      // Create media object and send
      const media = MessageMedia.fromFilePath(tmpFile);
      media.filename = `catsay_${timestamp}.png`;
      
      const caption = this.generateCaption(text, options);
      await message.reply(media, undefined, { caption });

      console.log(`✅ Successfully sent cat image to ${message.from}`);

    } catch (error) {
      console.error("❌ Error in catsay command:", error);
      const errorMessage = this.getErrorMessage(error);
      return message.reply(errorMessage);
      
    } finally {
      // Cleanup temporary files
      await this.cleanup(tmpFile);
    }
  },

  // Sanitize text input to prevent injection attacks
  sanitizeText: function(text) {
    // Remove potentially dangerous characters but keep basic punctuation
    const sanitized = text.replace(/[<>\"'&]/g, '').trim();
    
    // Check if text still has meaningful content
    if (sanitized.length === 0 || !/[a-zA-Z0-9]/.test(sanitized)) {
      return null;
    }
    
    return sanitized;
  },

  // Improved image download with better error handling
  downloadImage: async function(apiUrl) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(apiUrl, {
          responseType: "arraybuffer",
          timeout: 15000,
          maxContentLength: 5 * 1024 * 1024,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'WhatsApp-Bot-CatSay/1.2',
            'Accept': 'image/png,image/jpeg,image/*',
          },
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          }
        });

        // Validate response content
        if (!response.data || response.data.length === 0) {
          throw new Error("Empty response from API");
        }

        // Basic image validation (check for PNG/JPEG headers)
        const buffer = Buffer.from(response.data);
        if (!this.isValidImageBuffer(buffer)) {
          throw new Error("Invalid image data received");
        }

        return response;

      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError;
  },

  // Validate image buffer
  isValidImageBuffer: function(buffer) {
    if (buffer.length < 8) return false;
    
    // Check for PNG signature
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return true;
    }
    
    // Check for JPEG signature
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }
    
    return false;
  },

  // Parse command arguments for text and options
  parseArgs: function(args) {
    const fullText = args.join(" ");
    const options = {
      color: null,
      size: 'medium',
      filter: null
    };
    
    let text = fullText;
    
    // Parse options in order of precedence
    const optionPatterns = [
      { pattern: /--color=([a-zA-Z]+)/i, key: 'color' },
      { pattern: /--size=([a-zA-Z]+)/i, key: 'size' },
      { pattern: /--filter=([a-zA-Z]+)/i, key: 'filter' }
    ];

    optionPatterns.forEach(({ pattern, key }) => {
      const match = text.match(pattern);
      if (match) {
        options[key] = match[1].toLowerCase();
        text = text.replace(match[0], '').trim();
      }
    });
    
    return { text: text.trim(), options };
  },

  // Build API URL with options and better encoding
  buildApiUrl: function(text, options) {
    // Double encode to handle special characters properly
    const encodedText = encodeURIComponent(text);
    let url = `https://cataas.com/cat/cute/says/${encodedText}`;
    
    const params = new URLSearchParams();
    
    // Add validated parameters
    if (options.color && this.isValidColor(options.color)) {
      params.append('color', options.color);
    }
    
    if (options.size && this.isValidSize(options.size)) {
      params.append('size', options.size);
    }
    
    if (options.filter && this.isValidFilter(options.filter)) {
      params.append('filter', options.filter);
    }
    
    // Add cache-busting parameter
    params.append('_t', Date.now().toString());
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    return url;
  },

  // Generate caption with emojis and formatting
  generateCaption: function(text, options) {
    let caption = `🐱 "${text}"`;
    
    const details = [];
    if (options.color) details.push(`🎨 ${options.color}`);
    if (options.size && options.size !== 'medium') details.push(`📏 ${options.size}`);
    if (options.filter) details.push(`🔍 ${options.filter}`);
    
    if (details.length > 0) {
      caption += `\n${details.join(' • ')}`;
    }
    
    return caption;
  },

  // Get user-friendly error message
  getErrorMessage: function(error) {
    const baseMessage = "❌ Failed to generate cat image. ";
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return baseMessage + "Network connection failed. Please check your internet connection.";
    }
    
    if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
      return baseMessage + "Request timed out. The service might be slow, try again in a moment.";
    }
    
    if (error.response?.status === 429) {
      return baseMessage + "Too many requests. Please wait a moment before trying again.";
    }
    
    if (error.response?.status >= 500) {
      return baseMessage + "The cat service is temporarily unavailable. Please try again later.";
    }
    
    if (error.response?.status === 404) {
      return baseMessage + "The cat service endpoint was not found. Please try again later.";
    }
    
    if (error.message.includes('Invalid image data')) {
      return baseMessage + "Received invalid image data. Please try with different text or options.";
    }
    
    return baseMessage + "An unexpected error occurred. Please try again later.";
  },

  // Cleanup function
  cleanup: async function(tmpFile) {
    // Remove temporary file
    if (tmpFile) {
      try {
        await fs.unlink(tmpFile);
      } catch (error) {
        console.warn("Warning: Failed to cleanup temp file:", error.message);
      }
    }
  },

  // Validation functions with expanded options
  isValidColor: function(color) {
    const validColors = [
      'blue', 'red', 'green', 'yellow', 'orange', 
      'purple', 'pink', 'black', 'white', 'gray', 
      'grey', 'brown', 'cyan', 'magenta'
    ];
    return validColors.includes(color.toLowerCase());
  },

  isValidSize: function(size) {
    const validSizes = ['small', 'medium', 'large'];
    return validSizes.includes(size.toLowerCase());
  },

  isValidFilter: function(filter) {
    const validFilters = [
      'blur', 'mono', 'sepia', 'negative', 
      'paint', 'pixel', 'vintage'
    ];
    return validFilters.includes(filter.toLowerCase());
  }
};