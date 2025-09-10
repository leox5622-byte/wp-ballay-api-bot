// ===================================
// SOLUTION 1: Use Specific Web Version
// ===================================

const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth(),
    // Force specific WhatsApp Web version
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    },
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    }
});

// ===================================
// SOLUTION 2: Enhanced Error Handling
// ===================================

const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client-one"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    },
    // Add retry mechanism
    takeoverOnConflict: true,
    takeoverTimeoutMs: 30000
});

// Enhanced error handling
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    
    // Implement reconnection with delay
    setTimeout(() => {
        console.log('Attempting to reconnect...');
        client.initialize();
    }, 5000);
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.log('Uncaught Exception:', error);
});

// Initialize with retry logic
const initializeClient = async () => {
    try {
        await client.initialize();
    } catch (error) {
        console.error('Failed to initialize client:', error);
        
        // Wait and retry
        setTimeout(() => {
            console.log('Retrying initialization...');
            initializeClient();
        }, 10000);
    }
};

initializeClient();

// ===================================
// SOLUTION 3: Force Browser Download
// ===================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');

// Ensure Puppeteer browser is downloaded
(async () => {
    console.log('Checking browser installation...');
    
    try {
        const browser = await puppeteer.launch({ headless: true });
        await browser.close();
        console.log('Browser is properly installed');
        
        // Now initialize WhatsApp client
        initializeWhatsAppClient();
    } catch (error) {
        console.error('Browser installation issue:', error);
        console.log('Try running: npm install puppeteer --force');
    }
})();

function initializeWhatsAppClient() {
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
    });

    client.on('ready', () => {
        console.log('Client is ready!');
    });

    client.initialize();
}

// ===================================
// SOLUTION 4: Alternative with Delay
// ===================================

const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});

// Add delays to ensure proper loading
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
    
    // Add delay before considering ready
    setTimeout(() => {
        console.log('Authentication completed, waiting for ready state...');
    }, 2000);
});

client.on('ready', () => {
    console.log('Client is ready!');
    
    // Test if client is actually working
    setTimeout(async () => {
        try {
            const info = await client.info;
            console.log('Client info:', info);
        } catch (error) {
            console.error('Client not fully ready:', error);
        }
    }, 3000);
});

client.initialize();

// ===================================
// SOLUTION 5: Docker/Production Setup
// ===================================

const { Client, LocalAuth } = require('whatsapp-web.js');

// For production/Docker environments
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--run-all-compositor-stages-before-draw',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps'
        ]
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (msg) => {
    if (msg.body === '!ping') {
        try {
            await msg.reply('pong');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
});

client.initialize();

// ===================================
// SOLUTION 6: Manual Browser Path
// ===================================

const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Manually specify Chrome path if needed
        executablePath: process.env.CHROME_BIN || undefined,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

// ===================================
// DEBUGGING UTILITIES
// ===================================

const debugClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false, // Show browser for debugging
        devtools: true,  // Open DevTools
        slowMo: 250,     // Slow down operations
        args: ['--no-sandbox']
    }
});

debugClient.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

debugClient.on('ready', () => {
    console.log('Client is ready!');
});

// Log all events for debugging
debugClient.on('authenticated', () => console.log('authenticated'));
debugClient.on('auth_failure', (msg) => console.log('auth_failure', msg));
debugClient.on('change_state', (state) => console.log('change_state', state));
debugClient.on('disconnected', (reason) => console.log('disconnected', reason));

// Uncomment to use debug client
// debugClient.initialize();

// ===================================
// PACKAGE.JSON DEPENDENCIES
// ===================================

/*
Ensure your package.json has compatible versions:

{
  "dependencies": {
    "whatsapp-web.js": "^1.27.0",
    "puppeteer": "^21.0.0",
    "qrcode-terminal": "^0.12.0"
  }
}

Run these commands to fix dependency issues:

1. Clear npm cache:
   npm cache clean --force

2. Delete node_modules and package-lock.json:
   rm -rf node_modules package-lock.json

3. Reinstall dependencies:
   npm install

4. If still having issues, try:
   npm install puppeteer --force
   npm install whatsapp-web.js --force
*/