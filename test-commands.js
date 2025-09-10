const fs = require('fs');
const path = require('path');
const { loadCommands } = require('./scripts/cmdloadder');

// Test script to debug and validate all commands
async function testAllCommands() {
    console.log('🧪 Starting comprehensive command testing...');
    
    try {
        // Load all commands
        const commands = await loadCommands();
        console.log(`📋 Total commands loaded: ${commands.size}`);
        
        const results = {
            successful: [],
            failed: [],
            warnings: []
        };
        
        // Test each command
        for (const [name, command] of commands.entries()) {
            try {
                console.log(`\n🔍 Testing command: ${name}`);
                
                // Basic structure validation
                if (!command.config) {
                    results.warnings.push(`${name}: Missing config object`);
                    continue;
                }
                
                if (!command.onStart || typeof command.onStart !== 'function') {
                    results.warnings.push(`${name}: Missing or invalid onStart function`);
                    continue;
                }
                
                // Check required config properties
                const requiredProps = ['name', 'aliases', 'version', 'author', 'countDown', 'role', 'description', 'category', 'guide'];
                const missingProps = requiredProps.filter(prop => !command.config.hasOwnProperty(prop));
                
                if (missingProps.length > 0) {
                    results.warnings.push(`${name}: Missing config properties: ${missingProps.join(', ')}`);
                }
                
                // Test command structure
                console.log(`  ✅ Name: ${command.config.name || 'N/A'}`);
                console.log(`  ✅ Aliases: ${command.config.aliases ? command.config.aliases.join(', ') : 'None'}`);
                console.log(`  ✅ Category: ${command.config.category || 'N/A'}`);
                console.log(`  ✅ Role: ${command.config.role || 'N/A'}`);
                console.log(`  ✅ Description: ${command.config.description ? 'Present' : 'Missing'}`);
                
                results.successful.push(name);
                
            } catch (error) {
                console.log(`  ❌ Error testing ${name}: ${error.message}`);
                results.failed.push({ name, error: error.message });
            }
        }
        
        // Generate test report
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('=' .repeat(50));
        console.log(`✅ Successful commands: ${results.successful.length}`);
        console.log(`❌ Failed commands: ${results.failed.length}`);
        console.log(`⚠️  Commands with warnings: ${results.warnings.length}`);
        
        if (results.failed.length > 0) {
            console.log('\n❌ FAILED COMMANDS:');
            results.failed.forEach(({ name, error }) => {
                console.log(`  - ${name}: ${error}`);
            });
        }
        
        if (results.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            results.warnings.forEach(warning => {
                console.log(`  - ${warning}`);
            });
        }
        
        console.log('\n✅ SUCCESSFUL COMMANDS:');
        results.successful.forEach(name => {
            console.log(`  - ${name}`);
        });
        
        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            totalCommands: commands.size,
            successful: results.successful,
            failed: results.failed,
            warnings: results.warnings,
            summary: {
                successRate: ((results.successful.length / commands.size) * 100).toFixed(2) + '%',
                failureRate: ((results.failed.length / commands.size) * 100).toFixed(2) + '%'
            }
        };
        
        fs.writeFileSync('./test-results.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Detailed report saved to test-results.json');
        
        return report;
        
    } catch (error) {
        console.error('❌ Error during command testing:', error);
        throw error;
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testAllCommands()
        .then(report => {
            console.log('\n🎉 Command testing completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Command testing failed:', error);
            process.exit(1);
        });
}

module.exports = { testAllCommands };