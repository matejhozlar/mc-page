# 🎮 Create Rington Server Integration

Welcome to the backend codebase for **Create Rington**, a curated Minecraft modded server with rich community interaction through Discord and web services.

This Node.js server powers authentication, Discord/Minecraft integration, real-time chat, playtime tracking, whitelist automation, application forms, and more.

---

## 🌐 Live Server

🔗 https://create-rington.com  
📊 View Dynmap, chat, apply to join, and more.

---

## 📦 Tech Stack

- **Node.js** + **Express**
- **Socket.IO** – real-time chat sync
- **PostgreSQL** – player data and tokens
- **Discord.js** – two-way integration with Discord
- **Minecraft RCON** – in-game automation
- **minecraft-server-util** – server status checks
- **Multer** – image uploads
- **dotenv**, **uuid**, **cors**, **body-parser**

---

## ⚙️ Features

- 🔒 **Secure Token-Based Registration & Verification**
- 💬 **Two-Way Chat Sync** between Web & Discord & MC Server
- ⌛ **Playtime Tracking** with Top Player Roles
- 📝 **Whitelist Registration** via Discord
- 📷 **Image Uploads** from Web UI to Discord to MC Server
- 🧾 **Waitlist & Application System**
- 📊 **Player List & Live Server Stats**
- 🛡️ Role assignment automation for Discord

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/matejhozlar/mc-page.git
cd mc-page
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Configure Environment
#### Create a .env file and set the following:
```bash
env
PORT=5000
SERVER_IP=your.minecraft.server.ip
DB_USER=your_db_user
DB_HOST=your_db_host
DB_DATABASE=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432

DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_WEB_CHAT_BOT_TOKEN=your_web_chat_bot_token
DISCORD_GUILD_ID=your_guild_id
DISCORD_UNVERIFIED_ROLE_ID=role_id
DISCORD_PLAYER_ROLE_ID=role_id
DISCORD_VERIFY_CHANNEL_ID=channel_id

RCON_PORT=25575
RCON_PASSWORD=your_rcon_password
```
### 4. Run the Server
```bash
npm start
🔌 API Endpoints
Route	Description
/playerCount	Get current online player count
/players	List tracked players + playtime
/verify-token	Validate access token
/apply	Submit application to join
/wait-list	Join waitlist via email/Discord
/upload-image	Upload image to Discord chat
```
### 💬 Discord Integration
### Includes full support for:

- Slash commands (/register, /verify, /playtime, etc.)

- Auto-role assignment (Unverified ➡ Verified)

- Staff notifications for issues

- Chat history syncing

🤝 Contributions
Pull requests and improvements are welcome! Open issues for bugs or feature requests.

📧 Contact
📮 Email: admin@create-rington.com
🌍 Site: https://create-rington.com

