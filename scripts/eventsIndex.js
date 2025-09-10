const fs = require('fs-extra');
const path = require('path');
const { log } = require('./helpers');

async function loadEvents() {
    const events = new Map();
    const eventsPath = path.join(__dirname, '..', 'events');
    
    try {
        await fs.ensureDir(eventsPath);
        const files = await fs.readdir(eventsPath);
        const jsFiles = files.filter(file => file.endsWith('.js'));
        
        for (const file of jsFiles) {
            try {
                const filePath = path.join(eventsPath, file);
                delete require.cache[require.resolve(filePath)];
                const event = require(filePath);
                
                if (event.config && event.config.name && event.execute) {
                    events.set(event.config.name.toLowerCase(), event);
                    log(`✅ Loaded event: ${event.config.name}`, 'info');
                } else {
                    log(`⚠️ Invalid event file: ${file}`, 'warning');
                }
            } catch (error) {
                log(`❌ Error loading event ${file}: ${error.message}`, 'error');
            }
        }
        
        log(`🎉 Successfully loaded ${events.size} events`, 'success');
        return events;
    } catch (error) {
        log(`❌ Error loading events: ${error.message}`, 'error');
        return new Map();
    }
}

module.exports = { loadEvents };