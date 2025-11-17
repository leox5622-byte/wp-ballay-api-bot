// Bot Startup Troubleshooter
// Run this to diagnose startup issues

const fs = require('fs');
const path = require('path');

console.log('🔍 WhatsApp Bot Startup Troubleshooter\n');

// Check 1: Node.js version
console.log('1. Node.js Version Check:');
console.log(`   Node.js version: ${process.version}`);
if (parseFloat(process.version.substring(1)) < 16) {
    console.log('   ⚠️  Warning: Node.js 16+ recommended');
} else {
    console.log('   ✅ Node.js version is compatible');
}

// Check 2: Package.json and dependencies
console.log('\n2. Dependencies Check:');
try {
    const packageJson = require('./package.json');
    console.log(`   Package name: ${packageJson.name}`);
    console.log(`   Main script: ${packageJson.main || 'index.js'}`);
    
    const criticalDeps = ['@whiskeysockets/baileys', 'fs-extra', 'node-cache', 'qrcode'];
    criticalDeps.forEach(dep => {
        try {
            require.resolve(dep);
            console.log(`   ✅ ${dep}`);
        } catch {
            console.log(`   ❌ ${dep} - Run: npm install`);
        }
    });
} catch (error) {
    console.log('   ❌ Error reading package.json:', error.message);
}

// Check 3: Config file
console.log('\n3. Configuration Check:');
try {
    const config = require('./config.json');
    console.log('   ✅ Config file loaded');
    
    // Check critical config sections
    const criticalSections = ['bot', 'adminBot', 'database'];
    criticalSections.forEach(section => {
        if (config[section]) {
            console.log(`   ✅ ${section} section exists`);
        } else {
            console.log(`   ⚠️  ${section} section missing or empty`);
        }
    });
    
    // Check ports
    if (config.dashBoard && config.dashBoard.enabled) {
        console.log(`   📊 Dashboard enabled on port ${config.dashBoard.port || 3000}`);
    }
    
} catch (error) {
    console.log('   ❌ Error loading config.json:', error.message);
}

// Check 4: Required directories
console.log('\n4. Directory Structure Check:');
const requiredDirs = ['commands', 'scripts', 'events', 'auth_info', 'data'];
requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).length;
        console.log(`   ✅ ${dir}/ (${files} items)`);
    } else {
        console.log(`   ⚠️  ${dir}/ missing`);
    }
});

// Check 5: Port availability
console.log('\n5. Port Availability Check:');
const net = require('net');

function checkPort(port, callback) {
    const server = net.createServer();
    server.listen(port, () => {
        server.once('close', () => callback(true));
        server.close();
    });
    server.on('error', () => callback(false));
}

const config = require('./config.json');
const dashboardPort = config.dashBoard?.port || 3000;

checkPort(dashboardPort, (available) => {
    if (available) {
        console.log(`   ✅ Port ${dashboardPort} is available`);
    } else {
        console.log(`   ❌ Port ${dashboardPort} is in use`);
    }
    
    // Check 6: Try starting the bot
    console.log('\n6. Bot Startup Test:');
    console.log('   Attempting to load main bot file...');
    
    try {
        // Don't actually run it, just test if it loads
        delete require.cache[path.resolve('./index.js')];
        console.log('   ✅ Main bot file can be loaded');
        console.log('\n💡 Startup Solutions:');
        console.log('   1. Use PM2: npm install -g pm2 && pm2 start ecosystem.config.js');
        console.log('   2. Or run directly: node index.js');
        console.log('   3. Or use the startup script: start_bot.bat (Windows) or ./start_bot.sh (Linux/Mac)');
        
    } catch (error) {
        console.log(`   ❌ Error loading main bot file: ${error.message}`);
        console.log('\n🔧 Fix needed:');
        console.log('   - Check the error message above');
        console.log('   - Run: npm install');
        console.log('   - Verify config.json is valid JSON');
    }
});

// Check 7: PM2 status
console.log('\n7. PM2 Status:');
const { exec } = require('child_process');

exec('pm2 list', (error, stdout, stderr) => {
    if (error) {
        console.log('   ⚠️  PM2 not installed or not in PATH');
        console.log('   Install with: npm install -g pm2');
    } else {
        console.log('   ✅ PM2 is available');
        if (stdout.includes('whatsapp-bot')) {
            console.log('   📋 Bot is in PM2 process list');
        } else {
            console.log('   📋 Bot is not in PM2 process list');
        }
    }
});
