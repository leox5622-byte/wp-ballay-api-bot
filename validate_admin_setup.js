// Quick validation and setup script
// This script checks common issues and provides solutions

const fs = require('fs');
const path = require('path');

console.log('🔍 WhatsApp Bot Admin Function Validator\n');

// Check 1: Config file integrity
try {
    const config = require('./config.json');
    console.log('✅ Config file loaded successfully');
    
    // Check admin bot array
    if (Array.isArray(config.adminBot)) {
        console.log(`📋 Found ${config.adminBot.length} admin(s) configured:`);
        config.adminBot.forEach((admin, index) => {
            console.log(`   ${index + 1}. ${admin}`);
        });
        
        // Check for @lid format (should be changed)
        const hasLidFormat = config.adminBot.some(id => id.includes('@lid'));
        if (hasLidFormat) {
            console.log('⚠️  WARNING: Found @lid format in admin IDs. Consider updating to @s.whatsapp.net format.');
        } else {
            console.log('✅ Admin ID formats look good');
        }
    } else {
        console.log('❌ adminBot is not an array in config.json');
    }
    
} catch (error) {
    console.log('❌ Error loading config.json:', error.message);
    process.exit(1);
}

// Check 2: Admin command file
try {
    const adminPath = path.join(__dirname, 'commands', 'admin.js');
    if (fs.existsSync(adminPath)) {
        console.log('✅ Admin command file exists');
        
        const adminCommand = require('./commands/admin.js');
        if (adminCommand.config && adminCommand.onStart) {
            console.log('✅ Admin command structure is valid');
            console.log(`   - Name: ${adminCommand.config.name}`);
            console.log(`   - Version: ${adminCommand.config.version || 'Not specified'}`);
            console.log(`   - Role required: ${adminCommand.config.role} (0=User, 1=Group Admin, 2=Bot Owner)`);
        } else {
            console.log('❌ Admin command has invalid structure');
        }
    } else {
        console.log('❌ Admin command file not found');
    }
} catch (error) {
    console.log('⚠️  Warning loading admin command:', error.message);
}

// Check 3: Helper functions
try {
    const helpers = require('./scripts/helpers.js');
    if (typeof helpers.normalizeJid === 'function') {
        console.log('✅ normalizeJid helper function available');
        
        // Test normalization
        const testId = '1234567890@c.us';
        const normalized = helpers.normalizeJid(testId);
        console.log(`   Test: ${testId} → ${normalized}`);
    } else {
        console.log('❌ normalizeJid helper function not found');
    }
} catch (error) {
    console.log('❌ Error loading helpers:', error.message);
}

// Check 4: Node modules and dependencies
const requiredPackages = ['fs-extra', '@whiskeysockets/baileys', 'node-cache'];
console.log('\n📦 Checking required packages:');

requiredPackages.forEach(pkg => {
    try {
        require.resolve(pkg);
        console.log(`✅ ${pkg}`);
    } catch (error) {
        console.log(`❌ ${pkg} - Run: npm install ${pkg}`);
    }
});

// Provide recommendations
console.log('\n💡 Recommendations:');
console.log('1. Restart your bot after applying the fixes');
console.log('2. Test admin commands in both private chats and groups');
console.log('3. Check bot logs for any getUserRole errors');
console.log('4. Use the test script: node test_admin_functions.js');

console.log('\n🚀 Validation complete! If all checks passed, your admin functions should work properly.');
