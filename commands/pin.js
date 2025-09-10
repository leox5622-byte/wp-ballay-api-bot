const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { MessageMedia } = require("../scripts/messageMedia");

// Cache for API base URL to avoid repeated requests
let cachedApiUrl = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get API base URL from GitHub with caching
const baseApiUrl = async () => {
	const now = Date.now();
	
	// Return cached URL if still valid
	if (cachedApiUrl && (now - cacheTimestamp) < CACHE_DURATION) {
		return cachedApiUrl;
	}
	
	try {
		const response = await axios.get(
			"https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json",
			{ 
				timeout: 10000,
				headers: {
					'User-Agent': 'Pinterest-Bot/1.1'
				}
			}
		);
		
		if (!response.data || !response.data.api) {
			throw new Error("Invalid API URL response");
		}
		
		cachedApiUrl = response.data.api;
		cacheTimestamp = now;
		return cachedApiUrl;
		
	} catch (error) {
		console.error("Failed to fetch API URL:", error.message);
		
		// Fallback to cached URL if available
		if (cachedApiUrl) {
			console.warn("Using cached API URL due to fetch failure");
			return cachedApiUrl;
		}
		
		throw new Error("Unable to retrieve API URL");
	}
};

module.exports = {
	config: {
		name: "pin",
		aliases: ["pinterest"],
		version: "1.2",
		author: "Rahaman Leon",
		description: "Search and download images from Pinterest",
		usage: "pin <query> - <amount>",
		longDescription: "Search and download images from Pinterest. Supports 1-10 images per search.",
		category: "image",
		coolDown: 10,
		role: 0, // Available to all users
		guide: {
			en: `Usage: {prefix}pin <search term> - <number>
			
Examples:
• {prefix}pin cats - 3
• {prefix}pin nature wallpaper - 5
• {prefix}pin cute animals - 1

Note: Maximum 10 images per request`
		}
	},

	onStart: async function ({ message, args, client, prefix }) {
		// Input validation
		if (!args || args.length === 0) {
			return this.sendUsageMessage(client, message, prefix);
		}

		const inputText = args.join(" ").trim();
		const parsedInput = this.parseInput(inputText);
		
		if (!parsedInput) {
			return this.sendUsageMessage(client, message, prefix);
		}

		const { query, amount } = parsedInput;
		
		// Validate amount
		const maxAllowed = 10;
		if (amount > maxAllowed) {
			return await client.sendMessage(
				message.from, 
				`⚠️ You can request up to ${maxAllowed} images only.\nYou requested: ${amount}`
			);
		}

		// Send loading message
		let loadingMsg;
		try {
			loadingMsg = await client.sendMessage(
				message.from, 
				`🔍 **Searching Pinterest for** *"${query}"*\n\n📦 **Requested Images:** ${amount}\n⏳ Please wait...`
			);
		} catch (error) {
			console.error("Failed to send loading message:", error);
		}

		let tempFiles = [];
		
		try {
			// Get images from API
			const images = await this.fetchImages(query, amount);
			
			if (!images || images.length === 0) {
				if (loadingMsg) await this.deleteMessage(loadingMsg);
				return await client.sendMessage(
					message.from, 
					`❌ **No images found for:** *"${query}"*\n\n💡 **Try:**\n• Different keywords\n• More general terms\n• Check spelling`
				);
			}

			// Download and send images
			const processedCount = await this.processAndSendImages(
				client, message, images, query, amount, tempFiles
			);

			// Delete loading message and send success message
			if (loadingMsg) await this.deleteMessage(loadingMsg);
			
			await client.sendMessage(
				message.from, 
				`✅ **Successfully sent ${processedCount} image(s) for:** *"${query}"*`
			);

		} catch (error) {
			console.error("Pinterest command error:", error);
			
			// Delete loading message
			if (loadingMsg) await this.deleteMessage(loadingMsg);
			
			// Send appropriate error message
			const errorMessage = this.getErrorMessage(error);
			await client.sendMessage(message.from, errorMessage);
			
		} finally {
			// Cleanup temporary files
			await this.cleanupFiles(tempFiles);
		}
	},

	// Parse input to extract query and amount
	parseInput: function(input) {
		const parts = input.split("-");
		
		if (parts.length !== 2) {
			return null;
		}
		
		const query = parts[0].trim();
		const amountStr = parts[1].trim();
		
		if (!query || !amountStr) {
			return null;
		}
		
		const amount = parseInt(amountStr);
		
		if (isNaN(amount) || amount < 1 || amount > 50) {
			return null;
		}
		
		// Sanitize query
		const sanitizedQuery = this.sanitizeQuery(query);
		if (!sanitizedQuery) {
			return null;
		}
		
		return { query: sanitizedQuery, amount };
	},

	// Sanitize search query
	sanitizeQuery: function(query) {
		// Remove potentially harmful characters
		const sanitized = query
			.replace(/[<>\"'&\[\]{}]/g, '')
			.replace(/\s+/g, ' ')
			.trim();
		
		// Check if query still has meaningful content
		if (sanitized.length === 0 || sanitized.length > 100) {
			return null;
		}
		
		return sanitized;
	},

	// Fetch images from Pinterest API
	fetchImages: async function(query, amount) {
		try {
			const apiUrl = await baseApiUrl();
			const url = `${apiUrl}/pinterest?search=${encodeURIComponent(query)}&limit=${encodeURIComponent(amount)}`;
			
			const response = await axios.get(url, {
				timeout: 30000,
				headers: {
					'User-Agent': 'Pinterest-Bot/1.1',
					'Accept': 'application/json'
				},
				maxRedirects: 3
			});

			if (!response.data || !response.data.data) {
				throw new Error("Invalid API response format");
			}

			const images = response.data.data;
			
			// Validate images array
			if (!Array.isArray(images)) {
				throw new Error("Expected images array from API");
			}

			// Filter valid image URLs
			const validImages = images.filter(url => 
				typeof url === 'string' && 
				url.trim() !== '' && 
				this.isValidImageUrl(url)
			);

			return validImages;

		} catch (error) {
			if (error.code === 'ENOTFOUND') {
				throw new Error("Network connection failed");
			} else if (error.code === 'TIMEOUT') {
				throw new Error("Request timeout");
			} else if (error.response?.status === 429) {
				throw new Error("Rate limit exceeded");
			} else if (error.response?.status >= 500) {
				throw new Error("Pinterest service unavailable");
			}
			
			throw error;
		}
	},

	// Validate image URL
	isValidImageUrl: function(url) {
		try {
			const parsedUrl = new URL(url);
			const validProtocols = ['http:', 'https:'];
			const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
			
			if (!validProtocols.includes(parsedUrl.protocol)) {
				return false;
			}
			
			// Check if URL looks like an image URL
			const pathname = parsedUrl.pathname.toLowerCase();
			return imageExtensions.some(ext => pathname.includes(ext)) || 
				   pathname.includes('image') || 
				   parsedUrl.hostname.includes('pinimg');
				   
		} catch (error) {
			return false;
		}
	},

	// Process and send images
	processAndSendImages: async function(client, message, images, query, requestedAmount, tempFiles) {
		const tempDir = path.join(__dirname, "tmp");
		await fs.ensureDir(tempDir);
		
		const totalToProcess = Math.min(images.length, requestedAmount);
		let successCount = 0;
		
		for (let i = 0; i < totalToProcess; i++) {
			try {
				const imageUrl = images[i];
				const filename = `pin_${Date.now()}_${i}.jpg`;
				const imagePath = path.join(tempDir, filename);
				
				// Download image with timeout and size limit
				const imageResponse = await axios.get(imageUrl, {
					responseType: "arraybuffer",
					timeout: 20000,
					maxContentLength: 10 * 1024 * 1024, // 10MB limit
					headers: {
						'User-Agent': 'Pinterest-Bot/1.1',
						'Accept': 'image/*'
					}
				});

				// Validate image data
				if (!imageResponse.data || imageResponse.data.length === 0) {
					console.warn(`Empty image data for ${imageUrl}`);
					continue;
				}

				// Check if it's a valid image
				const buffer = Buffer.from(imageResponse.data);
				if (!this.isValidImageBuffer(buffer)) {
					console.warn(`Invalid image format for ${imageUrl}`);
					continue;
				}

				// Save image
				await fs.outputFile(imagePath, imageResponse.data);
				tempFiles.push(imagePath);

				// Create and send media
				const media = MessageMedia.fromFilePath(imagePath);
				media.filename = `pinterest_${i + 1}.jpg`;
				
				await client.sendMessage(message.from, media, {
					caption: `📌 **Pinterest Image ${i + 1}/${totalToProcess}**\n🔍 **Search:** "${query}"`
				});

				successCount++;
				
				// Small delay between sends to avoid rate limiting
				if (i < totalToProcess - 1) {
					await new Promise(resolve => setTimeout(resolve, 500));
				}

			} catch (imageError) {
				console.warn(`Failed to process image ${i + 1}:`, imageError.message);
				// Continue with next image
			}
		}
		
		return successCount;
	},

	// Validate image buffer
	isValidImageBuffer: function(buffer) {
		if (buffer.length < 8) return false;
		
		// Check for common image signatures
		const signatures = [
			[0x89, 0x50, 0x4E, 0x47], // PNG
			[0xFF, 0xD8, 0xFF],       // JPEG
			[0x47, 0x49, 0x46],       // GIF
			[0x52, 0x49, 0x46, 0x46]  // WEBP (starts with RIFF)
		];
		
		return signatures.some(sig => 
			sig.every((byte, index) => buffer[index] === byte)
		);
	},

	// Send usage message
	sendUsageMessage: function(client, message, prefix) {
		const usageText = `❌ **Wrong format!**

📝 **Usage:** \`${prefix}pin <query> - <amount>\`

📋 **Examples:**
• \`${prefix}pin cats - 3\`
• \`${prefix}pin nature wallpaper - 5\`
• \`${prefix}pin cute animals - 1\`

⚠️ **Rules:**
• Maximum 10 images per request
• Use hyphen (-) to separate query and amount
• Amount must be a number between 1-10`;

		return client.sendMessage(message.from, usageText);
	},

	// Get appropriate error message
	getErrorMessage: function(error) {
		const baseMessage = "❌ **Error occurred:**\n\n";
		
		if (error.message.includes("Network connection failed")) {
			return baseMessage + "🌐 Network connection failed. Please check your internet connection.";
		}
		
		if (error.message.includes("Request timeout")) {
			return baseMessage + "⏰ Request timed out. The service might be slow, try again later.";
		}
		
		if (error.message.includes("Rate limit exceeded")) {
			return baseMessage + "🚫 Too many requests. Please wait a moment before trying again.";
		}
		
		if (error.message.includes("service unavailable")) {
			return baseMessage + "🔧 Pinterest service is temporarily unavailable. Please try again later.";
		}
		
		if (error.message.includes("Unable to retrieve API URL")) {
			return baseMessage + "🔗 Unable to connect to the search service. Please try again later.";
		}
		
		return baseMessage + `🐛 ${error.message}\n\n💡 Try again with different search terms.`;
	},

	// Safe message deletion
	deleteMessage: async function(messageObj) {
		try {
			if (messageObj && typeof messageObj.delete === 'function') {
				await messageObj.delete(true);
			}
		} catch (error) {
			// Ignore deletion errors
			console.debug("Could not delete message:", error.message);
		}
	},

	// Cleanup temporary files
	cleanupFiles: async function(filePaths) {
		for (const filePath of filePaths) {
			try {
				await fs.unlink(filePath);
			} catch (error) {
				console.warn(`Failed to cleanup file ${filePath}:`, error.message);
			}
		}
	}
};
