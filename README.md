# Createrington Server Integration

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
- 🛡️ **Role assignment automation for Discord**

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
# server
PORT=your_backend_port
SERVER_IP=your_server_ip
# database
DB_USER=your_user
DB_HOST=your_host
DB_DATABASE=your_name
DB_PASSWORD=your_password
DB_PORT=your_port
# discord bots
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_guild_id
DISCORD_CHAT_CHANNEL_ID=your_channel_id
DISCORD_WEB_CHAT_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_client_id
# discord roles
DISCORD_TOP_PLAYTIME_ROLE_ID=your_role_id
DISCORD_UNVERIFIED_ROLE_ID=your_role_id
DISCORD_PLAYER_ROLE_ID=your_role_id
DISCORD_ADMIN_ROLE_ID=your_role_id
# playtime discord roles
DISCORD_STONE_ROLE_ID=your_role_id
DISCORD_COPPER_ROLE_ID=your_role_id
DISCORD_IRON_ROLE_ID=your_role_id
DISCORD_GOLD_ROLE_ID=your_role_id
DISCORD_DIAMOND_ROLE_ID=your_role_id
# discord channels
DISCORD_VERIFY_CHANNEL_ID=your_channel_id
DISCORD_ANNOUNCEMENT_CHANNEL_ID=your_channel_id
DISCORD_HALL_OF_FAME_CHANNEL_ID=your_channel_id
DISCORD_BOT_COMMANDS_CHANNEL_ID=your_channel_id
# admin
ADMIN_USER=your_user
ADMIN_PASSWORD=your_password
# rcon
RCON_PORT=your_rcon_port
RCON_PASSWORD=your_rcon_password
# email
EMAIL_PASSWORD=your_email_password
EMAIL_ADDRESS=your_email
EMAIL_PORT=your_port
EMAIL_HOST=your_host
```
### 4. Run the Server
```bash
npm start
🔌 API Endpoints
Route	Description
/playerCount	Get current online player count
/players	List tracked players + playtime
/verify-token	Validate access token
/apply	        Submit application to join
/wait-list	Join waitlist via email/Discord
/upload-image	Upload image to Discord chat
```
### 💬 Discord Integration
### Includes full support for:

- Slash commands (/register, /verify, /playtime, etc.)

- Auto-role assignment (Unverified ➡ Verified)

- Staff notifications for issues

- Chat history syncing

This project is fan-made, not affiliated with Mojang or Microsoft. All original Minecraft assets must be supplied by the end-user

📧 Contact
📮 Email: admin@create-rington.com
🌍 Site: https://create-rington.com

