// MessageMedia Compatibility Class for Baileys
// This provides compatibility with whatsapp-web.js MessageMedia class

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class MessageMedia {
    constructor(mimetype, data, filename) {
        this.mimetype = mimetype;
        this.data = data;
        this.filename = filename;
    }

    // Create MessageMedia from file path
    static fromFilePath(filePath) {
        try {
            const data = fs.readFileSync(filePath);
            const mimetype = this.getMimetypeFromExtension(path.extname(filePath));
            const filename = path.basename(filePath);
            
            return new MessageMedia(mimetype, data.toString('base64'), filename);
        } catch (error) {
            throw new Error(`Failed to create MessageMedia from file: ${error.message}`);
        }
    }

    // Create MessageMedia from URL
    static async fromUrl(url, options = {}) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: options.timeout || 30000,
                headers: options.headers || {}
            });
            
            const mimetype = response.headers['content-type'] || 'application/octet-stream';
            const data = Buffer.from(response.data).toString('base64');
            const filename = options.filename || this.getFilenameFromUrl(url);
            
            return new MessageMedia(mimetype, data, filename);
        } catch (error) {
            throw new Error(`Failed to create MessageMedia from URL: ${error.message}`);
        }
    }

    // Create MessageMedia from base64 data
    static fromBase64(mimetype, data, filename) {
        return new MessageMedia(mimetype, data, filename);
    }

    // Get mimetype from file extension
    static getMimetypeFromExtension(ext) {
        const mimetypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.avi': 'video/avi',
            '.mov': 'video/quicktime',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain'
        };
        
        return mimetypes[ext.toLowerCase()] || 'application/octet-stream';
    }

    // Extract filename from URL
    static getFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = path.basename(pathname);
            return filename || 'download';
        } catch (error) {
            return 'download';
        }
    }

    // Convert to Buffer
    toBuffer() {
        return Buffer.from(this.data, 'base64');
    }

    // Save to file
    save(filePath) {
        try {
            const buffer = this.toBuffer();
            fs.writeFileSync(filePath, buffer);
            return true;
        } catch (error) {
            throw new Error(`Failed to save MessageMedia: ${error.message}`);
        }
    }

    // Get file size
    get filesize() {
        return this.toBuffer().length;
    }

    // Check if it's an image
    get isImage() {
        return this.mimetype.startsWith('image/');
    }

    // Check if it's a video
    get isVideo() {
        return this.mimetype.startsWith('video/');
    }

    // Check if it's audio
    get isAudio() {
        return this.mimetype.startsWith('audio/');
    }

    // Check if it's a document
    get isDocument() {
        return !this.isImage && !this.isVideo && !this.isAudio;
    }
}

module.exports = { MessageMedia };