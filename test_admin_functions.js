// Admin Function Test Script
// Run this in your bot environment to test admin functionality

const { normalizeJid } = require('./scripts/helpers');

class AdminTester {
    constructor(config) {
        this.config = config;
        this.testResults = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        this.testResults.push({ timestamp, type, message });
    }

    // Test JID normalization
    testJidNormalization() {
        this.log('=== Testing JID Normalization ===');
        
        const testCases = [
            '1234567890@s.whatsapp.net',
            '1234567890@c.us',
            '1234567890@lid',
            '1234567890',
            'invalid-format'
        ];

        testCases.forEach(jid => {
            const normalized = normalizeJid(jid);
            this.log(`${jid} → ${normalized}`);
        });
    }

    // Test admin ID consistency
    testAdminIdConsistency() {
        this.log('=== Testing Admin ID Consistency ===');
        
        const adminBotIds = this.config.adminBot || [];
        let hasInconsistency = false;

        adminBotIds.forEach((id, index) => {
            const normalized = normalizeJid(id);
            if (id !== normalized) {
                this.log(`Admin ID ${index}: ${id} → ${normalized} (INCONSISTENT)`, 'warning');
                hasInconsistency = true;
            } else {
                this.log(`Admin ID ${index}: ${id} (CONSISTENT)`);
            }
        });

        if (hasInconsistency) {
            this.log('❌ Admin ID inconsistency detected! Update config.json with normalized IDs.', 'error');
        } else {
            this.log('✅ All admin IDs are consistent', 'success');
        }
    }

    // Test role detection logic
    testRoleDetection() {
        this.log('=== Testing Role Detection Logic ===');
        
        const testUsers = [
            { id: '60734361149@s.whatsapp.net', expected: 'Bot Owner' },
            { id: '8801723153138@s.whatsapp.net', expected: 'Bot Owner' },
            { id: '9999999999@s.whatsapp.net', expected: 'Regular User' }
        ];

        testUsers.forEach(testUser => {
            const normalizedId = normalizeJid(testUser.id);
            const isOwner = this.config.adminBot.some(adminId => 
                normalizeJid(adminId) === normalizedId
            );
            
            const actualRole = isOwner ? 'Bot Owner' : 'Regular User';
            const status = actualRole === testUser.expected ? '✅' : '❌';
            
            this.log(`${status} ${testUser.id} → ${actualRole} (Expected: ${testUser.expected})`);
        });
    }

    // Test command structure
    testCommandStructure() {
        this.log('=== Testing Command Structure ===');
        
        try {
            const adminCommand = require('./commands/admin.js');
            
            const requiredFields = ['config', 'onStart'];
            const configFields = ['name', 'role', 'description'];
            
            let passed = true;
            
            requiredFields.forEach(field => {
                if (!adminCommand[field]) {
                    this.log(`❌ Missing required field: ${field}`, 'error');
                    passed = false;
                } else {
                    this.log(`✅ Found required field: ${field}`);
                }
            });
            
            if (adminCommand.config) {
                configFields.forEach(field => {
                    if (!adminCommand.config[field]) {
                        this.log(`❌ Missing config field: ${field}`, 'error');
                        passed = false;
                    } else {
                        this.log(`✅ Found config field: ${field}`);
                    }
                });
            }
            
            if (passed) {
                this.log('✅ Admin command structure is valid', 'success');
            } else {
                this.log('❌ Admin command structure has issues', 'error');
            }
            
        } catch (error) {
            this.log(`❌ Error loading admin command: ${error.message}`, 'error');
        }
    }

    // Generate test report
    generateReport() {
        this.log('=== Test Summary ===');
        
        const errorCount = this.testResults.filter(r => r.type === 'error').length;
        const warningCount = this.testResults.filter(r => r.type === 'warning').length;
        
        this.log(`Total tests run: ${this.testResults.length}`);
        this.log(`Errors: ${errorCount}`);
        this.log(`Warnings: ${warningCount}`);
        
        if (errorCount === 0) {
            this.log('🎉 All critical tests passed! Admin functions should work correctly.', 'success');
        } else {
            this.log('⚠️ Some tests failed. Please review and fix the issues above.', 'warning');
        }
        
        return {
            totalTests: this.testResults.length,
            errors: errorCount,
            warnings: warningCount,
            results: this.testResults
        };
    }

    // Run all tests
    runAllTests() {
        this.log('🚀 Starting Admin Function Tests...');
        
        this.testJidNormalization();
        this.testAdminIdConsistency();
        this.testRoleDetection();
        this.testCommandStructure();
        
        return this.generateReport();
    }
}

// Export for use in bot environment
module.exports = AdminTester;

// If run directly, execute tests
if (require.main === module) {
    try {
        const config = require('./config.json');
        const tester = new AdminTester(config);
        const report = tester.runAllTests();
        
        // Save report to file
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, 'admin_test_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n📊 Test report saved to: ${reportPath}`);
    } catch (error) {
        console.error('❌ Error running tests:', error.message);
    }
}
