const fs = require("fs-extra");
const axios = require("axios");
const { MessageMedia } = require("../scripts/messageMedia");
let createCanvas, loadImage, registerFont;
try {
    const canvas = require("canvas");
    createCanvas = canvas.createCanvas;
    loadImage = canvas.loadImage;
    registerFont = canvas.registerFont;
} catch (error) {
    createCanvas = null;
    loadImage = null;
    registerFont = null;
}
const path = require("path");
const Canvas = require('canvas');

// Register Bengali font with error handling
try {
  if (registerFont) {
    const fontPath = path.join(__dirname, "..", "fonts", "NotoSansBengali-Regular.ttf");
    if (fs.existsSync(fontPath)) {
      registerFont(fontPath, { family: "Noto Sans Bengali" });
    }
  }
} catch (error) {
  console.log("Bengali font not found, using default font");
}

module.exports = {
  config: {
    name: "write",
    aliases: ["wr", "text"],
    version: "2.0",
    author: "Rahaman Leon",
    coolDown: 5,
    role: 0,
    description: "Write text on a replied image with auto-sized text",
    category: "image",
    guide: {
      en: "Reply to an image and use:\n{prefix}write [color] - <text>\n\nUse {prefix}write list to see available colors.\nIf no color is provided, white will be used by default.\n\nExample: {prefix}write r - Hello World"
    }
  },

  langs: {
    en: {
      colorList: "🎨 **Available Colors:**\n\n%1\n\n💡 **Usage:** Reply to an image and type `{prefix}write [color] - [text]`\n📝 **Example:** `{prefix}write r - Hello World`\n\nIf no color is specified, white will be used by default.",
      noText: "⚠️ **Please provide text to write!**\n\n📖 **Usage:** `{prefix}write [color] - [text]`\n📝 **Example:** `{prefix}write r - Hello World`",
      noImage: "⚠️ **Please reply to an image!**\n\n📷 To use this command:\n1. Reply to any image\n2. Type `{prefix}write [color] - [text]`",
      processing: "🔄 **Processing image, please wait...**\n⏳ Adding text to your image...",
      downloadError: "❌ **Error downloading the image**\n🔄 Please try again with a different image.",
      processError: "❌ **Error processing the image**\n💡 Make sure the file is a valid image format.",
      success: "✅ **Text added successfully!**\n🎨 Your image has been processed."
    }
  },

  onStart: async function ({ message, args, prefix }) {
    if (!createCanvas || !loadImage) {
      return await message.reply("❌ This command is currently unavailable due to missing dependencies. Please contact the bot administrator.");
    }
    
    try {
      const colorMap = {  
        b: "black",  
        w: "white",  
        r: "red",  
        bl: "blue",  
        g: "green",  
        y: "yellow",  
        o: "orange",  
        p: "purple",  
        pk: "pink",
        gr: "gray",
        br: "brown",
        cy: "cyan",
        mg: "magenta"
      };  

      // Show color list
      if (args[0]?.toLowerCase() === "list") {  
        const colorList = Object.entries(colorMap)
          .map(([short, full]) => `**${short}** → ${full}`)
          .join("\n");
        
        return await message.reply(
          this.langs.en.colorList
            .replace('%1', colorList)
            .replace('{prefix}', prefix)
        );  
      }  

      let input = args.join(" ");  
      let color = "white";
      let text = "";  

      // Parse color and text
      if (input.includes(" - ")) {  
        [color, text] = input.split(" - ").map(item => item.trim());  
        color = colorMap[color.toLowerCase()] || color.toLowerCase();  
        if (!Object.values(colorMap).includes(color) && !isValidCSSColor(color)) {
          color = "white";   
        }
      } else {  
        text = input.trim();  
      }  

      if (!text) {
        return await message.reply(this.langs.en.noText.replace('{prefix}', prefix));
      }

      // Check if replying to an image
      if (!message.hasQuotedMsg) {
        return await message.reply(this.langs.en.noImage.replace('{prefix}', prefix));
      }

      const quotedMsg = await message.getQuotedMessage();
      if (!quotedMsg.hasMedia || quotedMsg.type !== 'image') {
        return await message.reply(this.langs.en.noImage.replace('{prefix}', prefix));
      }

      // Send processing message
      await message.reply(this.langs.en.processing);

      // Download the image
      const media = await quotedMsg.downloadMedia();
      if (!media) {
        return await message.reply(this.langs.en.downloadError);
      }

      // Process the image
      const processedImage = await processImageWithText(media.data, text, color);
      if (!processedImage) {
        return await message.reply(this.langs.en.processError);
      }

      // Create MessageMedia and send
      const outputMedia = new MessageMedia('image/png', processedImage.toString('base64'));
      await message.reply(outputMedia, undefined, { caption: this.langs.en.success });

    } catch (error) {
      console.error("Error in write command:", error);
      await message.reply(this.langs.en.processError);
    }
  }
};

// Helper function to check if a color is valid CSS color
function isValidCSSColor(color) {
  const validColors = [
    'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque',
    'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue',
    'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan',
    'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkkhaki',
    'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon',
    'darkseagreen', 'darkslateblue', 'darkslategray', 'darkturquoise', 'darkviolet',
    'deeppink', 'deepskyblue', 'dimgray', 'dodgerblue', 'firebrick', 'floralwhite',
    'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray',
    'green', 'greenyellow', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory',
    'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue',
    'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen',
    'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
    'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon',
    'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen',
    'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred',
    'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy',
    'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
    'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru',
    'pink', 'plum', 'powderblue', 'purple', 'red', 'rosybrown', 'royalblue',
    'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver',
    'skyblue', 'slateblue', 'slategray', 'snow', 'springgreen', 'steelblue', 'tan',
    'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke',
    'yellow', 'yellowgreen'
  ];
  
  return validColors.includes(color.toLowerCase()) || /^#[0-9A-F]{6}$/i.test(color);
}

// Function to process image with text
async function processImageWithText(imageData, text, color) {
  try {
    // Convert base64 to buffer if needed
    const buffer = Buffer.isBuffer(imageData) ? imageData : Buffer.from(imageData, 'base64');
    
    // Load image
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Draw the original image
    ctx.drawImage(img, 0, 0);

    // Calculate initial font size based on image dimensions
    const baseFontSize = Math.min(img.width, img.height) / 15;
    let fontSize = Math.max(baseFontSize, 20);

    // Set font with fallback
    const fontFamily = fs.existsSync(path.join(__dirname, "..", "fonts", "NotoSansBengali-Regular.ttf")) 
      ? "Noto Sans Bengali" 
      : "Arial, sans-serif";

    ctx.font = `bold ${fontSize}px ${fontFamily}`;

    // Auto-resize text to fit image width with some padding
    const maxWidth = img.width * 0.85;
    while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
      fontSize--;
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
    }

    // Set text properties
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add text stroke for better visibility
    const strokeColor = getContrastColor(color);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(2, fontSize / 15);

    // Position text at bottom center with padding
    const textX = canvas.width / 2;
    const textY = canvas.height - (fontSize * 1.5);

    // Draw text with stroke first, then fill
    ctx.strokeText(text, textX, textY);
    ctx.fillText(text, textX, textY);

    // Return processed image as buffer
    return canvas.toBuffer('image/png');

  } catch (error) {
    console.error("Error processing image:", error);
    return null;
  }
}

// Helper function to get contrasting color for stroke
function getContrastColor(color) {
  const lightColors = ['white', 'yellow', 'lime', 'cyan', 'lightblue', 'lightgreen', 
                      'lightpink', 'lightyellow', 'lightgray', 'silver'];
  return lightColors.includes(color.toLowerCase()) ? 'black' : 'white';
}