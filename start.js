#!/usr/bin/env node

// Fast startup wrapper for npm start compatibility
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 WhatsApp Bot Quick Start');
console.log('===========================');

// Check if PM2 is available and preferred
const args = process.argv.slice(2);
const useDirectNode = args.includes('--direct') || args.includes('--no-pm2');

if (!useDirectNode) {
  try {
    require.resolve('pm2');
    console.log('📦 PM2 detected - Starting with process manager...');
    
    const pm2Process = spawn('pm2', ['start', 'ecosystem.config.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    pm2Process.on('close', (code) => {
      if (code !== 0) {
        console.log('⚠️  PM2 start failed, falling back to direct mode...');
        startDirect();
      }
    });
    
    return;
  } catch (error) {
    console.log('⚠️  PM2 not available, starting directly...');
  }
}

function startDirect() {
  console.log('🔄 Starting bot directly...');
  
  const botProcess = spawn('node', ['--max-old-space-size=1024', 'index.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  botProcess.on('close', (code) => {
    console.log(`\n📊 Bot process exited with code ${code}`);
    if (code === 1) {
      console.log('🔄 Bot requested restart - Please run the command again');
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot...');
    botProcess.kill('SIGTERM');
  });
}

startDirect();
