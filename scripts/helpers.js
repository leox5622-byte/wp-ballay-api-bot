const mongoose = require('mongoose');
const chalk = require('chalk');
const moment = require('moment');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config.json');
const User = require('../models/User');
const Group = require('../models/Group');

// Prevent long buffering when DB is unreachable
mongoose.set('bufferCommands', false);

// Determine preferred database mode and JSON path
const preferredDbType = (config.database && config.database.type) ? config.database.type.toLowerCase() : 'mongodb';
let currentDbMode = preferredDbType; // can switch to 'json' if Mongo fails
const jsonDbPath = (config.database && config.database.path) ? config.database.path : path.join(__dirname, '..', 'data', 'database.json');

// Optimized JSON DB helpers with caching
let jsonDbCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds cache

async function loadJsonDB() {
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (jsonDbCache && (now - lastCacheTime) < CACHE_TTL) {
      return jsonDbCache;
    }
    
    if (!(await fs.pathExists(jsonDbPath))) {
      await fs.ensureDir(path.dirname(jsonDbPath));
      await fs.writeJson(jsonDbPath, { users: {}, groups: {} }, { spaces: 2 });
    }
    const data = await fs.readJson(jsonDbPath);
    if (!data.users) data.users = {};
    if (!data.groups) data.groups = {};
    
    // Update cache
    jsonDbCache = data;
    lastCacheTime = now;
    return data;
  } catch (e) {
    console.error('❌ Failed to load JSON DB:', e.message);
    return { users: {}, groups: {} };
  }
}

async function saveJsonDB(data) {
  try {
    // Update cache
    jsonDbCache = data;
    lastCacheTime = Date.now();
    
    await fs.ensureDir(path.dirname(jsonDbPath));
    await fs.writeJson(jsonDbPath, data, { spaces: 2 });
  } catch (e) {
    console.error('❌ Failed to save JSON DB:', e.message);
  }
}

// Logging function
function log(message, type = 'info') {
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red
  };
  const coloredMessage = colors[type] ? colors[type](message) : message;
  console.log(`[${timestamp}] ${coloredMessage}`);
}

// Format uptime
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Initialize database (Mongo or JSON fallback)
async function initDatabase() {
  try {
    if (preferredDbType === 'json') {
      await loadJsonDB();
      currentDbMode = 'json';
      log(`✅ JSON database initialized at ${jsonDbPath}`, 'success');
      return;
    }

    const uri = config.database && config.database.uri;
    if (uri && uri.startsWith('mongodb')) {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000 // fail fast to allow fallback
      });
      if (mongoose.connection.readyState === 1) {
        currentDbMode = 'mongodb';
        log('✅ MongoDB connected', 'success');
        return;
      }
    } else {
      log('⚠️ No MongoDB URI provided. Falling back to JSON mode. Set config.database.type to "mongodb" and provide a valid URI to use MongoDB.', 'warning');
    }
  } catch (err) {
    log(`❌ MongoDB connection error: ${err.message}`, 'error');
    log('⚠️ Falling back to JSON database mode.', 'warning');
  }

  // Fallback to JSON mode
  await loadJsonDB();
  currentDbMode = 'json';
  log(`✅ JSON database ready at ${jsonDbPath}`, 'success');
}

// ✅ Get user data with DB-mode awareness
async function getUserData(userId, name = null) {
  if (currentDbMode === 'json') {
    const db = await loadJsonDB();
    let user = db.users[userId];
    if (!user) {
      user = {
        id: userId,
        name: name || "",
        coins: 0,
        exp: 0,
        level: 1,
        lastActive: Date.now(),
        commandCount: 0,
        messageCount: 0, // Add messageCount field
        lastDailyReward: null,
        joinDate: Date.now()
      };
      db.users[userId] = user;
      await saveJsonDB(db);
    } else if (name && name !== user.name) {
      user.name = name;
      await saveJsonDB(db);
    }
    return user;
  }

  // MongoDB mode
  let user = await User.findOne({ id: userId });
  if (!user) {
    user = new User({
      id: userId,
      name: name || "",
      coins: 0,
      exp: 0,
      level: 1,
      lastActive: Date.now(),
      commandCount: 0,
      messageCount: 0, // Add messageCount field
      lastDailyReward: null,
      joinDate: Date.now()
    });
    await user.save();
  } else if (name && name !== user.name) {
    user.name = name;
    await user.save();
  }
  return user;
}

// ✅ Get all users with DB-mode awareness
async function getAllUsers(sortField = 'exp', limit = 0, filter = {}) {
  if (currentDbMode === 'json') {
    const db = await loadJsonDB();
    let users = Object.values(db.users);

    // Apply filter
    users = users.filter(user => {
      for (const key in filter) {
        if (filter.hasOwnProperty(key)) {
          const filterValue = filter[key];
          const userValue = user[key];

          if (typeof filterValue === 'object' && filterValue !== null && !Array.isArray(filterValue)) {
            // Handle MongoDB-like operators for numbers
            if (filterValue.$gt !== undefined && typeof userValue === 'number') {
              if (!(userValue > filterValue.$gt)) return false;
            }
            // Add more operators as needed
          } else if (userValue !== filterValue) {
            return false;
          }
        }
      }
      return true;
    });

    // Apply sort
    users.sort((a, b) => {
      if (sortField.startsWith('-')) {
        const field = sortField.substring(1);
        return (b[field] || 0) - (a[field] || 0);
      }
      return (a[sortField] || 0) - (b[sortField] || 0);
    });

    // Apply limit
    if (limit > 0) {
      users = users.slice(0, limit);
    }
    return users;
  }

  // MongoDB mode
  let query = User.find(filter);
  if (sortField) {
    query = query.sort({ [sortField]: -1 }); // Default to descending for now
  }
  if (limit > 0) {
    query = query.limit(limit);
  }
  return await query;
}

// Update user data
async function updateUserData(userId, updates) {
  if (currentDbMode === 'json') {
    const db = await loadJsonDB();
    const user = db.users[userId] || { id: userId };
    db.users[userId] = { ...user, ...updates };
    await saveJsonDB(db);
    return db.users[userId];
  }

  return await User.findOneAndUpdate(
    { id: userId },
    { $set: updates },
    { new: true, upsert: true }
  );
}

// Get group data
async function getGroupData(groupId) {
  if (currentDbMode === 'json') {
    const db = await loadJsonDB();
    let group = db.groups[groupId];
    if (!group) {
      group = {
        id: groupId,
        settings: {
          welcomeDisabled: false,
          welcomeMessage: null,
          goodbyeDisabled: false
        },
        commandCount: 0,
        members: []
      };
      db.groups[groupId] = group;
      await saveJsonDB(db);
    }
    return group;
  }

  let group = await Group.findOne({ id: groupId });
  if (!group) {
    group = new Group({
      id: groupId,
      settings: {
        welcomeDisabled: false,
        welcomeMessage: null,
        goodbyeDisabled: false
      },
      commandCount: 0,
      members: []
    });
    await group.save();
  }
  return group;
}

// Update group data
async function updateGroupData(groupId, updates) {
  if (currentDbMode === 'json') {
    const db = await loadJsonDB();
    const group = db.groups[groupId] || { id: groupId };
    db.groups[groupId] = { ...group, ...updates };
    await saveJsonDB(db);
    return db.groups[groupId];
  }

  return await Group.findOneAndUpdate(
    { id: groupId },
    { $set: updates },
    { new: true, upsert: true }
  );
}

// OpenAI integration
async function callOpenAI(prompt, userId = null) {
  if (!config.ai || !config.ai.openai || !config.ai.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.ai.openai.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant in a WhatsApp bot.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${config.ai.openai.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    log(`OpenAI API error: ${error.message}`, 'error');
    throw new Error('Failed to get AI response');
  }
}

// Media downloader
async function downloadMedia(message) {
  try {
    if (message.hasMedia) {
      const media = await message.downloadMedia();
      return media;
    }
    return null;
  } catch (error) {
    log(`Media download error: ${error.message}`, 'error');
    return null;
  }
}

// ✅ Track command and update name if needed
async function trackCommand(userId, name = null) {
  try {
    const userData = await getUserData(userId, name);
    await updateUserData(userId, {
      commandCount: (userData.commandCount || 0) + 1,
      lastActive: Date.now()
    });
  } catch (error) {
    log(`Error tracking command for user ${userId}: ${error.message}`, 'error');
  }
}

module.exports = {
  log,
  formatUptime,
  initDatabase,
  getUserData,
  updateUserData,
  getGroupData,
  updateGroupData,
  getAllUsers, // Add the new helper function
  callOpenAI,
  downloadMedia,
  trackCommand,
  normalizeJid
};

// Normalize JID to a consistent format
function normalizeJid(jid) {
  if (!jid) return '';
  let normalized = String(jid);

  // If it's a group JID, return as is
  if (normalized.includes('@g.us')) {
    return normalized;
  }

  // For user JIDs, extract only the numerical part and append @s.whatsapp.net
  // This handles formats like number@s.whatsapp.net, number@c.us, number@lid, or just a number
  const match = normalized.match(/^(\d+)(?:@.*)?$/);
  if (match && match[1]) {
    return `${match[1]}@s.whatsapp.net`;
  }
  
  // Fallback for any other unexpected formats
  return normalized;
}
