const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const QRCode = require('qrcode');
const moment = require('moment');
const fs = require('fs-extra');
const chalk = require('chalk');

class DashboardServer {
    constructor(port = 3001, botInstance = null) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.botInstance = botInstance;
        this.qrCode = null;
        this.botStatus = 'disconnected';
        this.logs = [];
        this.maxLogs = 1000;
        this.connectedClients = new Set();
        
        // Dashboard password from environment
        this.dashboardPassword = process.env.DASHBOARD_PASSWORD || 'admin123';
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // CORS and basic middleware
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Session management
        this.app.use(session({
            secret: process.env.SESSION_SECRET || 'whatsapp-bot-dashboard-secret',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: false,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        }));
        
        // Serve static files from public directory
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Authentication middleware
        const requireAuth = (req, res, next) => {
            if (req.session.authenticated) {
                next();
            } else {
                res.status(401).json({ error: 'Authentication required' });
            }
        };

        // Login endpoint
        this.app.post('/api/login', async (req, res) => {
            try {
                const { password } = req.body;
                
                if (password === this.dashboardPassword) {
                    req.session.authenticated = true;
                    res.json({ success: true, message: 'Login successful' });
                    this.log('Dashboard login successful', 'success');
                } else {
                    res.status(401).json({ error: 'Invalid password' });
                    this.log('Dashboard login failed - invalid password', 'warning');
                }
            } catch (error) {
                this.log(`Dashboard login error: ${error.message}`, 'error');
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Logout endpoint
        this.app.post('/api/logout', (req, res) => {
            req.session.destroy();
            res.json({ success: true, message: 'Logged out successfully' });
        });

        // Check auth status
        this.app.get('/api/auth-status', (req, res) => {
            res.json({ authenticated: !!req.session.authenticated });
        });

        // QR Code endpoint
        this.app.get('/api/qr', requireAuth, async (req, res) => {
            try {
                if (this.qrCode) {
                    // Convert data URL to buffer
                    const base64Data = this.qrCode.replace(/^data:image\/png;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    res.setHeader('Content-Type', 'image/png');
                    res.setHeader('Cache-Control', 'no-cache');
                    res.send(buffer);
                } else {
                    // Generate placeholder QR
                    const placeholder = await QRCode.toBuffer('QR code not available', {
                        width: 256,
                        margin: 2
                    });
                    res.setHeader('Content-Type', 'image/png');
                    res.send(placeholder);
                }
            } catch (error) {
                this.log(`QR API error: ${error.message}`, 'error');
                res.status(500).json({ error: 'Failed to generate QR code' });
            }
        });

        // Bot status endpoint
        this.app.get('/api/status', requireAuth, (req, res) => {
            try {
                const uptime = this.botInstance ? Date.now() - this.botInstance.startTime : 0;
                const clientInfo = this.botInstance?.client?.info;
                
                res.json({
                    status: this.botStatus,
                    uptime: this.formatUptime(uptime),
                    isAuthenticated: this.botInstance?.isAuthenticated || false,
                    user: clientInfo ? {
                        number: clientInfo.wid.user,
                        name: clientInfo.pushname || 'Unknown'
                    } : null,
                    timestamp: Date.now()
                });
            } catch (error) {
                this.log(`Status API error: ${error.message}`, 'error');
                res.status(500).json({ error: 'Failed to get bot status' });
            }
        });

        // Bot info endpoint
        this.app.get('/api/info', requireAuth, async (req, res) => {
            try {
                const configPath = path.join(__dirname, '..', 'config.json');
                const packagePath = path.join(__dirname, '..', 'package.json');
                
                let config = {};
                let packageInfo = {};
                
                if (await fs.pathExists(configPath)) {
                    config = await fs.readJSON(configPath);
                }
                
                if (await fs.pathExists(packagePath)) {
                    packageInfo = await fs.readJSON(packagePath);
                }
                
                const commandCount = this.botInstance?.commands?.size || 0;
                
                res.json({
                    bot: {
                        name: config.bot?.name || 'WhatsApp Bot',
                        prefix: config.bot?.prefix || '!',
                        version: packageInfo.version || '1.0.0',
                        author: packageInfo.author || 'Rahaman Leon',
                        description: packageInfo.description || 'Advanced WhatsApp Bot'
                    },
                    stats: {
                        commandCount,
                        eventCount: this.botInstance?.events?.size || 0,
                        uptime: this.botInstance ? Date.now() - this.botInstance.startTime : 0
                    },
                    features: {
                        dashboard: config.dashBoard?.enabled || false,
                        autoRestart: config.autoRestart?.enabled || false,
                        rateLimiting: config.rateLimiting?.enabled || false,
                        database: config.database?.type || 'json'
                    }
                });
            } catch (error) {
                this.log(`Info API error: ${error.message}`, 'error');
                res.status(500).json({ error: 'Failed to get bot info' });
            }
        });

        // Commands list endpoint
        this.app.get('/api/commands', requireAuth, (req, res) => {
            try {
                const commands = [];
                
                if (this.botInstance?.commands) {
                    for (const [name, command] of this.botInstance.commands) {
                        // Only include main commands (not aliases)
                        if (name === command.config.name.toLowerCase()) {
                            commands.push({
                                name: command.config.name,
                                description: command.config.description || 'No description',
                                category: command.config.category || 'Other',
                                coolDown: command.config.coolDown || 0,
                                role: command.config.role || 0,
                                aliases: command.config.aliases || [],
                                author: command.config.author || 'Unknown',
                                version: command.config.version || '1.0.0'
                            });
                        }
                    }
                }
                
                // Group by category
                const grouped = commands.reduce((acc, cmd) => {
                    const category = cmd.category.toUpperCase();
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(cmd);
                    return acc;
                }, {});
                
                res.json({
                    total: commands.length,
                    commands: grouped
                });
            } catch (error) {
                this.log(`Commands API error: ${error.message}`, 'error');
                res.status(500).json({ error: 'Failed to get commands' });
            }
        });

        // Logs endpoint
        this.app.get('/api/logs', requireAuth, (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 100;
                const offset = parseInt(req.query.offset) || 0;
                
                const logsToSend = this.logs
                    .slice(-limit - offset, this.logs.length - offset)
                    .reverse();
                
                res.json({
                    logs: logsToSend,
                    total: this.logs.length,
                    hasMore: this.logs.length > limit + offset
                });
            } catch (error) {
                this.log(`Logs API error: ${error.message}`, 'error');
                res.status(500).json({ error: 'Failed to get logs' });
            }
        });

        // Serve the main dashboard HTML
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // Catch all routes to serve dashboard
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            this.connectedClients.add(socket.id);
            this.log(`Dashboard client connected: ${socket.id}`, 'info');
            
            // Send current status to new client
            socket.emit('status', {
                status: this.botStatus,
                qrCode: this.qrCode,
                isAuthenticated: this.botInstance?.isAuthenticated || false
            });
            
            socket.on('disconnect', () => {
                this.connectedClients.delete(socket.id);
                this.log(`Dashboard client disconnected: ${socket.id}`, 'info');
            });
            
            // Handle ping for connection check
            socket.on('ping', () => {
                socket.emit('pong');
            });
        });
    }

    setupErrorHandling() {
        this.app.use((err, req, res, next) => {
            this.log(`Dashboard error: ${err.message}`, 'error');
            res.status(500).json({ error: 'Internal server error' });
        });
    }

    // Public methods for bot integration
    updateQRCode(qrCodeData) {
        this.qrCode = qrCodeData;
        this.botStatus = 'waiting_for_qr';
        this.broadcast('qr-updated', { qrCode: qrCodeData });
        this.log('QR code updated and broadcasted to clients', 'info');
    }

    updateBotStatus(status, data = {}) {
        this.botStatus = status;
        this.broadcast('status-updated', { status, ...data });
        this.log(`Bot status updated: ${status}`, 'info');
    }

    addLog(message, type = 'info') {
        const logEntry = {
            id: Date.now() + Math.random(),
            message,
            type,
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            time: Date.now()
        };
        
        this.logs.push(logEntry);
        
        // Keep only last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        this.broadcast('log-added', logEntry);
    }

    broadcast(event, data) {
        this.io.emit(event, data);
    }

    log(message, type = 'info') {
        const colors = {
            info: chalk.blue,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red
        };
        
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const coloredMessage = colors[type] ? colors[type](message) : message;
        console.log(`[${timestamp}] [DASHBOARD] ${coloredMessage}`);
        
        // Also add to internal logs
        this.addLog(`[DASHBOARD] ${message}`, type);
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    start() {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                this.log(`Dashboard server running on http://localhost:${this.port}`, 'success');
                resolve();
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            this.server.close(() => {
                this.log('Dashboard server stopped', 'info');
                resolve();
            });
        });
    }
}

module.exports = DashboardServer;