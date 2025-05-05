import express from "express";
import { status } from "minecraft-server-util";
import { Server } from "socket.io";
import pg from "pg";
import bodyParser from "body-parser";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Client, GatewayIntentBits } from "discord.js";
import { AttachmentBuilder } from "discord.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { Rcon } from "rcon-client";
import fetch from "node-fetch";
import axios from "axios";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import logger from "./logger.js";
import rconLogger from "./rconLogger.js";

//services
import { startPlaytimeTracking } from "./services/playtimeTracker.js";
import { assignTopPlayerRole } from "./services/assignTopTplayerRole.js";
import { assignPlaytimeRole } from "./services/assignPlaytimeRoles.js";
import { isAdmin } from "./services/admin.js";

// utils
import logError from "./utils/logError.js";
import { notifyAdminWaitlist } from "./utils/emailAdminOnWaitlist.js";

// Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load command handlers
const commandsPath = path.join(__dirname, "discord", "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));
const commandHandlers = new Map();

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const commandModule = await import(pathToFileURL(filePath).href);

  if (commandModule.data && typeof commandModule.execute === "function") {
    commandHandlers.set(commandModule.data.name, commandModule);
  } else {
    logger.warn(`⚠️ Skipped loading ${file} — missing data or execute()`);
  }
}
logger.info(`✅ Loaded ${commandHandlers.size} Discord command(s).`);

// image storage
const upload = multer({ storage: multer.memoryStorage() });

// bot instance for sending messages
import { Client as WebChatClient } from "discord.js";

dotenv.config();
logger.info("✅ Environment variables loaded.");

const app = express();
const port = process.env.PORT || 5000;
const messageCooldowns = {};

// cookie parser (admin login)
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// http server
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// DB connection
const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();
logger.info("📦 Connected to PostgreSQL database.");

// server IP, PORT
const serverIP = process.env.SERVER_IP;
const serverPort = 26980;

// start playtime tracking
startPlaytimeTracking(db, serverIP, serverPort);
logger.info("🕒 Started playtime tracking.");

const MINECRAFT_CHANNEL_NAME = "minecraft-chat";

// --- Web Chat Bot ---
const webChatClient = new WebChatClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

webChatClient.once("ready", () => {
  logger.info(`WebChatBot ready as ${webChatClient.user.tag}`);
});
logger.info("🧾 Summary:");
logger.info(`   Port: ${port}`);
logger.info(`   DB: ${process.env.DB_HOST}/${process.env.DB_DATABASE}`);
logger.info(`   Discord Guild ID: ${process.env.DISCORD_GUILD_ID}`);
logger.info(`   Minecraft Server: ${serverIP}:${serverPort}`);

try {
  await webChatClient.login(process.env.DISCORD_WEB_CHAT_BOT_TOKEN);
} catch (error) {
  logger.error(`❌ Failed to login WebChatBot: ${logError(error)}`);
}

// helper function for random delay
function randomDelay(min = 1000, max = 5000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// message history fetch
async function fetchDiscordChatHistory(limit = 100) {
  try {
    const guild = client.guilds.cache.first();
    const channel = guild.channels.cache.find(
      (ch) => ch.name === MINECRAFT_CHANNEL_NAME
    );

    if (!channel || !channel.isTextBased()) {
      logger.info("Channel not found or not text-based.");
      return [];
    }

    const fetched = await channel.messages.fetch({ limit });
    logger.info(`Fetched messages count: ${fetched.size}`);

    const webBotId = webChatClient.user?.id;

    const messagesArray = Array.from(fetched.values())
      .reverse()
      .filter((msg) => {
        // Always allow non-bot messages
        if (!msg.author.bot) return true;

        // Allow bot messages from web bot
        if (msg.author.id === webBotId) return true;

        // Also allow valid Minecraft format messages
        return msg.content.match(/^`<[^<>]+>`/);
      })
      .map((msg) => {
        const name = msg.member?.displayName || msg.author.username;
        const image = msg.attachments?.first()?.url || null;

        return {
          text: `[${name}]: ${msg.content}`,
          image,
        };
      });

    return messagesArray;
  } catch (error) {
    logger.error(`❌ Failed to fetch Discord history: ${logError(error)}`);
    return [];
  }
}

// --- WebChatBot to Discord  ---
async function sendToMinecraftChat(message) {
  try {
    const guild = await webChatClient.guilds.fetch(
      process.env.DISCORD_GUILD_ID
    );
    const channel = guild.channels.cache.find(
      (ch) => ch.name === MINECRAFT_CHANNEL_NAME
    );

    if (channel && channel.isTextBased()) {
      await channel.send(`${message}`);
    }
  } catch (error) {
    logger.error(`WebChatBot send error: ${logError(error)}`);
  }
}

// --- Discord Listener Bot ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// discord bot commands setup
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandHandlers.get(interaction.commandName);
  if (!command) {
    logger.warn(`⚠️ Unknown command received: /${interaction.commandName}`);
    return;
  }

  logger.info(
    `📩 ${interaction.user.tag} (${interaction.user.id}) ran /${interaction.commandName}`
  );

  try {
    await command.execute(interaction, db);
  } catch (error) {
    logger.error(
      `❌ Error executing command ${interaction.commandName}: ${logError(
        error
      )}`
    );
    await interaction.reply({ content: "❌ Command failed.", ephemeral: true });
  }
});

client.once("ready", () => {
  logger.info(`Discord bot ready as ${client.user.tag}`);

  logger.info("🚀 Server initialization complete. Awaiting connections...");
  httpServer.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });

  // // Assign Top Player role once on startup
  // assignTopPlayerRole(db, client);

  // // Then every hour
  // setInterval(() => {
  //   assignTopPlayerRole(db, client);
  // }, 60 * 60 * 1000);

  // assignPlaytimeRole(db, client, true);

  // setInterval(() => {
  //   assignPlaytimeRole(db, client, false);
  // }, 60 * 60 * 1000);
});

// creatin a message
client.on("messageCreate", (message) => {
  if (!message.channel || message.channel.name !== MINECRAFT_CHANNEL_NAME)
    return;

  if (message.author.id === webChatClient.user.id) return;

  const content = message.content?.trim();
  const hasImage = message.attachments?.size > 0;
  if (!content && !hasImage) return;

  const image = message.attachments?.first()?.url || null;
  const displayName = message.member?.displayName || message.author.username;
  const formatted = `[${displayName}]: ${message.content}`;

  io.emit("chatMessage", { text: formatted, image });
});

// --- Web Socket Chat Handling ---
io.on("connection", async (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on("requestChatHistory", async () => {
    const history = await fetchDiscordChatHistory(100);
    logger.info(
      `🔥 Sending chatHistory to client via request: ${history.length}`
    );
    socket.emit("chatHistory", history);
  });

  socket.on("sendChatMessage", async (data) => {
    const { message, token, authorName } = data;

    const now = Date.now();
    const lastSent = messageCooldowns[socket.id] || 0;

    if (!message || !token) {
      logger.warn("⛔ Missing message or token from client");
      return;
    }

    if (now - lastSent < 10000) {
      logger.info(`⏳ Cooldown block for socket: ${socket.id}`);
      return;
    }

    messageCooldowns[socket.id] = now;

    try {
      let displayName = authorName || "web";

      // If not using the hardcoded admin token, verify it against DB
      if (token !== "admin") {
        const result = await db.query(
          `SELECT discord_name FROM chat_tokens WHERE token = $1 AND expires_at > NOW()`,
          [token]
        );

        if (result.rows.length === 0) {
          logger.warn("⛔ Invalid or expired token");
          return;
        }

        displayName = authorName || result.rows[0].discord_name;
      }

      const formattedMessage = `<${displayName}> ${message}`;

      logger.info(`✅ Authenticated message from ${displayName}: ${message}`);

      await sendToMinecraftChat(formattedMessage);

      io.emit("chatMessage", {
        text: formattedMessage,
        image: null,
        authorType: "web",
      });
    } catch (error) {
      logger.error(`❌ Error handling chat message: ${logError(error)}`);
    }
  });

  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// --- API Routes ---
let lastLoggedPlayerCount = null;

app.get("/api/playerCount", async (req, res) => {
  try {
    const response = await status(serverIP, serverPort, { timeout: 5000 });
    const count = response.players.online;

    // Only log when the count has changed
    if (count !== lastLoggedPlayerCount) {
      logger.info(
        `📊 Player count changed: ${count} online at ${serverIP}:${serverPort}`
      );
      lastLoggedPlayerCount = count;
    }

    res.json({ count });
  } catch (error) {
    logger.error(`Error querying server: ${logError(error)}`);
    res.status(500).json({ err: "Failed to fetch player count" });
  }
});

// fetching online players
let lastPlayerCount = null;

app.get("/api/players", async (req, res) => {
  try {
    const response = await status(serverIP, serverPort, { timeout: 5000 });
    const onlinePlayers = response.players.sample || [];

    if (onlinePlayers.length !== lastPlayerCount) {
      logger.info(
        `🎮 ${onlinePlayers.length} players fetched from Minecraft server.`
      );
      lastPlayerCount = onlinePlayers.length;
    }

    for (const player of onlinePlayers) {
      try {
        await db.query(
          `INSERT INTO users (uuid, name) VALUES ($1, $2)
           ON CONFLICT (uuid) DO NOTHING`,
          [player.id, player.name]
        );
      } catch (error) {
        logger.warn(
          `⚠️ Failed to insert player ${player.name}: ${logError(error)}`
        );
      }
    }

    const result = await db.query(
      `SELECT uuid as id, name, online, last_seen, play_time_seconds, session_start
       FROM users
       WHERE last_seen IS NOT NULL
       ORDER BY online DESC, name`
    );

    res.json({ players: result.rows });
  } catch (error) {
    logger.error(
      `❌ Error fetching or processing player list: ${logError(error)}`
    );
    res.status(500).json({ error: "Could not fetch players" });
  }
});

// token verification
app.post("/api/verify-token", async (req, res) => {
  const { token } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (!token) {
    logger.warn(`⚠️ Token verification attempt with missing token from ${ip}`);
    return res.status(400).json({ success: false, error: "Missing token" });
  }

  try {
    const result = await db.query(
      `SELECT discord_id, discord_name FROM chat_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      logger.warn(`⛔ Invalid or expired token attempt from ${ip}`);
      return res
        .status(401)
        .json({ success: false, error: "Token expired or invalid" });
    }

    const user = result.rows[0];
    logger.info(
      `✅ Token verified for Discord user: ${user.discord_name} (${user.discord_id}) from ${ip}`
    );

    return res.json({
      success: true,
      user: {
        id: user.discord_id,
        name: user.discord_name,
      },
    });
  } catch (error) {
    logger.error(`❌ Token verification failed from ${ip}: ${logError(error)}`);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

// aply form
app.post("/api/apply", async (req, res) => {
  const { mcName, dcName, age, howFound, experience, whyJoin } = req.body;

  logger.info(
    `📨 Application received — MC: ${mcName}, DC: ${dcName}, Age: ${age}`
  );

  const insertQuery = `
    INSERT INTO applications (mc_name, dc_name, age, how_found, experience, why_join)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  try {
    const result = await db.query(insertQuery, [
      mcName,
      dcName,
      age,
      howFound || null,
      experience || null,
      whyJoin,
    ]);
    logger.info(`✅ Application inserted for ${mcName} (${dcName})`);
    res.json({ success: true, application: result.rows[0] });
  } catch (error) {
    logger.error(
      `❌ Failed to insert application — MC: ${mcName}, DC: ${dcName}: ${logError(
        error
      )}`
    );
    res.status(500).json({ error: "Error submitting application" });
  }
});

// waitlist form
app.post("/api/wait-list", async (req, res) => {
  const { email, discordName } = req.body;

  logger.info(`📥 Waitlist submission attempt: ${email} / ${discordName}`);

  if (!email || !discordName) {
    logger.warn(`❌ Missing email or Discord name in waitlist form.`);
    return res.status(400).json({
      error:
        "Email and Discord username are required.\nIf you're having trouble, contact admin@create-rington.com",
    });
  }

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (!isValidEmail(email)) {
    logger.warn(`❌ Invalid email format: ${email}`);
    return res.status(400).json({
      error:
        "Invalid email format.\nIf you're having trouble, contact admin@create-rington.com",
    });
  }

  try {
    // Check if email already exists
    const emailExists = await db.query(
      `SELECT 1 FROM waitlist_emails WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    if (emailExists.rowCount > 0) {
      logger.warn(`⚠️ Duplicate email on waitlist: ${email}`);
      return res.status(409).json({
        error:
          "This email is already on the waitlist.\nIf you're having trouble, contact admin@create-rington.com",
      });
    }

    // Check if discordName already exists (optional, but recommended)
    const discordExists = await db.query(
      `SELECT 1 FROM waitlist_emails WHERE LOWER(discord_name) = LOWER($1)`,
      [discordName]
    );
    if (discordExists.rowCount > 0) {
      logger.warn(`⚠️ Duplicate Discord name on waitlist: ${discordName}`);
      return res.status(409).json({
        error:
          "This Discord username is already registered.\nIf you're having trouble, contact admin@create-rington.com",
      });
    }

    // Insert new waitlist entry
    const insertQuery = `
      INSERT INTO waitlist_emails (email, discord_name)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [email, discordName]);

    logger.info(`✅ Waitlist entry added: ${email} (${discordName})`);
    await notifyAdminWaitlist({ email, discordName });
    res.json({ success: true, entry: result.rows[0] });
  } catch (error) {
    logger.error(
      `❌ Failed to insert waitlist entry for ${email}: ${logError(error)}`
    );
    res.status(500).json({
      error:
        "Error submitting waitlist entry.\nIf you're having trouble, contact admin@create-rington.com",
    });
  }
});

//sending images from WEB
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  const file = req.file;
  const messageText = req.body.message || "";
  const authorName = req.body.authorName || "web";

  if (!file) {
    logger.warn(
      `❌ Image upload attempt failed — no file received from ${authorName}`
    );
    return res.status(400).json({ error: "No image uploaded" });
  }

  logger.info(
    `📷 Received image upload from ${authorName}: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`
  );

  try {
    const guild = await webChatClient.guilds.fetch(
      process.env.DISCORD_GUILD_ID
    );
    const channel = guild.channels.cache.find(
      (ch) => ch.name === MINECRAFT_CHANNEL_NAME
    );

    if (!channel || !channel.isTextBased()) {
      logger.error(
        "❌ Image upload failed: Discord channel not found or not text-based"
      );
      return res.status(500).json({ error: "Channel not found" });
    }

    const formattedMessage = `<${authorName}> ${messageText}`;

    const attachment = new AttachmentBuilder(file.buffer, {
      name: file.originalname,
    });

    const sentMessage = await channel.send({
      content: formattedMessage,
      files: [attachment],
    });

    const sentAttachment = sentMessage.attachments.first();
    const imageUrl = sentAttachment?.url || null;

    logger.info(
      `✅ Image uploaded and sent by ${authorName} — Discord URL: ${imageUrl}`
    );

    io.emit("chatMessage", {
      text: formattedMessage,
      image: imageUrl,
      authorType: "web",
    });

    return res.json({ success: true, image: imageUrl });
  } catch (error) {
    logger.error(
      `❌ Failed to send image to Discord from ${authorName}: ${logError(
        error
      )}`
    );
    return res.status(500).json({ error: "Failed to send image" });
  }
});

// callback for discord login
app.post("/api/discord/callback", async (req, res) => {
  const code = req.body.code;
  logger.info(`🔐 Received Discord OAuth callback with code: ${code}`);

  try {
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.ADMIN_CLIENT_ID,
        client_secret: process.env.ADMIN_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.ADMIN_REDIRECT_URI,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenRes.data.access_token;
    logger.info("✅ OAuth token exchange successful.");

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const user = userRes.data;
    logger.info(`👤 Fetched Discord user: ${user.username} (${user.id})`);

    // Check if user.id exists in the admins table
    const result = await db.query(
      `SELECT 1 FROM admins WHERE discord_id = $1 LIMIT 1`,
      [user.id]
    );

    const isAdmin = result.rowCount > 0;

    if (!isAdmin) {
      return res.status(403).json({ error: "Not an admin." });
    }

    // Set cookie for validated admin
    res.cookie("admin_session", user.id, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24,
    });

    logger.info(`🔓 Admin session started for ${user.username} (${user.id})`);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`OAuth or admin check error: ${logError(error)}`);
    res.status(500).json({ error: "OAuth error" });
  }
});

// validate admin
app.get("/api/admin/validate", async (req, res) => {
  const discordId = req.cookies.admin_session;

  if (!discordId) {
    logger.warn("🔍 Admin validate request without session.");
    return res.status(400).json({ valid: false });
  }

  try {
    const valid = await isAdmin(db, discordId);
    logger.info(`🛂 Admin validate check: ${discordId} => ${valid}`);
    res.json({ valid });
  } catch (error) {
    logger.error(`❌ Admin validation error: ${logError(error)}`);
    res.status(500).json({ valid: false });
  }
});

// admin logout
app.post("/api/admin/logout", (req, res) => {
  const discordId = req.cookies.admin_session;
  logger.info(`🚪 Admin logout requested for: ${discordId || "unknown"}`);

  res.clearCookie("admin_session", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });
  res.status(200).json({ success: true });
});

// get admin username
app.get("/api/admin/me", async (req, res) => {
  const discordId = req.cookies.admin_session;

  if (!discordId) {
    logger.warn("👤 /me requested without session.");
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const isAdminUser = await isAdmin(db, discordId);
    if (!isAdminUser) {
      logger.warn(`⛔ Non-admin attempted /me: ${discordId}`);
      return res.status(403).json({ error: "Not an admin" });
    }

    const result = await db.query(`SELECT * FROM users WHERE discord_id = $1`, [
      discordId,
    ]);

    if (result.rows.length === 0) {
      logger.warn(`❓ Admin user not found in users table: ${discordId}`);
      return res.status(404).json({ error: "User not found in database" });
    }

    logger.info(`📥 Admin /me data sent for: ${discordId}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error(`Failed to fetch admin user data: ${logError(error)}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// admin rcon messages
app.post("/api/admin/rcon", async (req, res) => {
  const { command } = req.body;
  const discordId = req.cookies.admin_session;

  if (!discordId) {
    rconLogger.warn("⛔ RCON request denied: no session cookie");
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  try {
    const isAdminUser = await isAdmin(db, discordId);
    if (!isAdminUser) {
      rconLogger.warn(`⛔ RCON access denied for non-admin: ${discordId}`);
      return res.status(403).json({ success: false, error: "Not an admin" });
    }

    const userRes = await db.query(
      `SELECT name FROM users WHERE discord_id = $1`,
      [discordId]
    );

    const adminMcName = userRes.rows[0]?.name || "unknown";

    const isSilentCommand = /^\/v get\b/i.test(command);

    if (!isSilentCommand) {
      rconLogger.info(
        `🔐 RCON command received from ${adminMcName} (${discordId}): ${command}`
      );
    }

    const rcon = await Rcon.connect({
      host: process.env.SERVER_IP,
      port: parseInt(process.env.RCON_PORT),
      password: process.env.RCON_PASSWORD,
    });

    const response = await rcon.send(command);
    await rcon.end();

    if (!isSilentCommand) {
      await db.query(
        `INSERT INTO rcon_logs (discord_id, mc_name, command) VALUES ($1, $2, $3)`,
        [discordId, adminMcName, command]
      );

      rconLogger.info(`✅ RCON command executed successfully: ${command}`);
    }

    return res.json({ success: true, response });
  } catch (error) {
    rconLogger.error(
      `❌ RCON execution failed for ${discordId}: ${logError(error)}`
    );
    return res.status(500).json({ success: false, error: "RCON failure" });
  }
});

// player tabs
app.get("/api/admin/users", async (req, res) => {
  const discordId = req.cookies.admin_session;

  if (!discordId) {
    logger.warn("⛔ Attempt to access /admin/users without session cookie");
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const isAdminUser = await isAdmin(db, discordId);
    if (!isAdminUser) {
      logger.warn(
        `⛔ Unauthorized /admin/users access attempt by ${discordId}`
      );
      return res.status(403).json({ error: "Not an admin" });
    }

    const result = await db.query(
      `SELECT uuid, name, play_time_seconds, last_seen, online FROM users ORDER BY name ASC`
    );

    logger.info(`📊 Admin ${discordId} fetched user list.`);
    res.json({ users: result.rows });
  } catch (error) {
    logger.error(`Failed to fetch users: ${logError(error)}`);
    res.status(500).json({ error: "Database error" });
  }
});

// auto add unverified role on join
client.on("guildMemberAdd", async (member) => {
  const unverifiedRoleId = process.env.DISCORD_UNVERIFIED_ROLE_ID;
  const verifyChannelId = process.env.DISCORD_VERIFY_CHANNEL_ID;

  try {
    await member.roles.add(unverifiedRoleId);
    logger.info(`✅ Assigned Unverified role to ${member.user.tag}`);

    const channel = member.guild.channels.cache.get(verifyChannelId);
    if (channel?.isTextBased()) {
      await channel.send(
        `👋 Welcome <@${member.user.id}> to **Createrington**!\n\n🔑 **First Step:** You must verify your **access token**.\nPlease type: \`/verify <your_token>\`\n\n📬 Your token was sent to your email when you applied to join. Check your inbox (and spam folder)!\n\n⚡ **After verifying**, you can then use: \`/register <your_minecraft_username>\`\n(Example: \`/register Notch\`)\n\n⚠️ **Important:**\n- \`mc_name\` means your exact **Minecraft username** (correct spelling, capitalization doesn't matter).\n- **Fake usernames** or **wrong tokens** will block your access.\n\n🎉 We're excited to have you join us — see you in-game soon!`
      );
    }
  } catch (error) {
    logger.error(
      `❌ Error assigning role or sending message: ${logError(error)}`
    );
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

app.use((error, req, res, next) => {
  logger.error(
    `Unhandled Express error at ${req.method} ${req.url}: ${logError(error)}`
  );
  res.status(500).json({ error: "Internal server error" });
});

process.on("SIGINT", async () => {
  logger.info("🧹 Gracefully shutting down...");
  try {
    await db.end();
    io.close();
    httpServer.close(() => {
      logger.info("✅ Server closed. Exiting...");
      process.exit(0);
    });
  } catch (error) {
    logger.error(`❌ Error during shutdown: ${logError(error)}`);
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  logger.error(`🧨 Unhandled promise rejection: ${logError(reason)}`);
});
