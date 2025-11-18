# 🤖 WhatsApp Bot V2

Advanced WhatsApp Bot with modular architecture, built with Node.js and whatsapp-web.js.

## ✨ Features

- 🔧 Modular command system
- 📊 Built-in dashboard
- ⚡ Rate limiting
- 🔄 Auto-restart functionality
- 👥 Group management
- 🎯 Role-based permissions
- 📱 Multi-device support
- 🚀 Cloud deployment ready

## 🚀 Quick Deploy to Render

### Option 1: One-Click Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Option 2: Manual Setup
1. Run the deployment script:
   ```bash
   # On Windows
   ./deploy.bat
   
   # On Linux/Mac
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. Follow the script instructions to push to GitHub

3. Connect your GitHub repository to Render

## 📋 Local Development

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/whatsapp-bot.git
cd whatsapp-bot

# Install dependencies
npm install

# Configure the bot
cp config.json config.local.json
# Edit config.local.json with your settings

# Start the bot
npm start
```

## ⚙️ Configuration

### Basic Settings
```json
{
  "bot": {
    "name": "WhatsApp Bot",
    "prefix": "!",
    "version": "2.0.0"
  },
  "adminBot": [
    "YOUR_PHONE_NUMBER@c.us"
  ]
}
```

### Environment Variables (Production)
```
NODE_ENV=production
PORT=10000
BOT_PREFIX=!
DASHBOARD_ENABLED=true
```

## 🔧 Commands

### Basic Commands
- `!help` - Show available commands
- `!prefix` - Show current prefix
- `!ping` - Check bot responsiveness

### Admin Commands
- `!restart` - Restart the bot
- `!eval <code>` - Execute JavaScript code
- `!cmd <command>` - Execute system commands

## 📊 Dashboard

Access the web dashboard at:
- Local: `http://localhost:3000`
- Production: `https://your-app-name.onrender.com`

## 🌐 Deployment

### Render (Recommended)
1. Fork this repository
2. Connect to Render
3. Configure environment variables
4. Deploy!

### Heroku
```bash
# Install Heroku CLI
heroku create your-app-name
git push heroku main
```

### VPS/Cloud Server
```bash
# Using PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔐 Security

- Never commit sensitive data
- Use environment variables for production
- Implement rate limiting
- Validate all inputs
- Keep dependencies updated

## 🛠️ Development

### Project Structure
```
whatsapp-bot/
├── commands/          # Bot commands
├── events/           # Event handlers
├── scripts/          # Helper scripts
├── data/            # Bot data storage
├── logs/            # Log files
├── config.json      # Configuration
└── index.js         # Main bot file
```

### Adding Commands
1. Create a new file in `commands/`
2. Export command configuration
3. Implement `onStart` function
4. Restart bot to load

### Adding Events
1. Create a new file in `events/`
2. Export event configuration
3. Implement event handlers
4. Restart bot to load

## 📚 API Reference

### Command Structure
```javascript
module.exports = {
  config: {
    name: "commandname",
    role: 0, // 0: User, 1: Admin, 2: Owner
    shortDescription: "Command description",
    longDescription: "Detailed description",
    category: "category",
    guide: "Usage guide",
    coolDown: 5
  },
  onStart: async ({ message, args, client }) => {
    // Command logic here
  }
};
```

### Event Structure
```javascript
module.exports = {
  config: {
    name: "eventname",
    version: "1.0.0",
    description: "Event description"
  },
  execute: async (client, ...args) => {
    // Event logic here
  }
};
```

## 🔄 Updates

### Automatic Updates
The bot checks for updates automatically. To update:
```bash
git pull origin main
npm install
npm restart
```

### Manual Updates
1. Download latest version
2. Backup your config
3. Replace files
4. Restore config
5. Restart bot

## 🐛 Troubleshooting

### Common Issues
1. **QR Code not appearing**: Check logs for errors
2. **Commands not working**: Verify prefix and permissions
3. **Bot not responding**: Check WhatsApp Web connection
4. **Memory issues**: Restart bot or upgrade hosting

### Debug Mode
```bash
NODE_ENV=development npm start
```

## 📞 Support

- **Documentation**: Check the deployment guide
- **Issues**: Report on GitHub Issues
- **Community**: Join our Discord/Telegram group

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## ⭐ Star History

If you find this project useful, please consider giving it a star!

## 🙏 Acknowledgments

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API
- [Render](https://render.com) - Deployment platform
- All contributors and users

---

**Made with ❤️ by [Rahaman Leon](https://github.com/leox-2)**

*Happy Botting! 🤖*
