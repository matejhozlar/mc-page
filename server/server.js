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
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reactBuildPath = path.join(__dirname, "..", "client", "build");

const upload = multer({ storage: multer.memoryStorage() });

// bot instance for sending messages
import { Client as WebChatClient } from "discord.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const messageCooldowns = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(reactBuildPath));

app.use(cors({ origin: true, credentials: true }));

app.set("trust proxy", 1);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

const serverIP = process.env.SERVER_IP;
const serverPort = 26980;

const MINECRAFT_CHANNEL_NAME = "minecraft-chat";

// --- Web Chat Bot ---
const webChatClient = new WebChatClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

webChatClient.once("ready", () => {
  console.log(`WebChatBot ready as ${webChatClient.user.tag}`);
});

webChatClient.login(process.env.DISCORD_WEB_CHAT_BOT_TOKEN);

async function fetchDiscordChatHistory(limit = 100) {
  try {
    const guild = client.guilds.cache.first();
    const channel = guild.channels.cache.find(
      (ch) => ch.name === MINECRAFT_CHANNEL_NAME
    );

    if (!channel || !channel.isTextBased()) {
      console.log("Channel not found or not text-based.");
      return [];
    }

    const fetched = await channel.messages.fetch({ limit });
    console.log("Fetched messages count:", fetched.size);

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
  } catch (err) {
    console.error("Failed to fetch Discord history:", err);
    return [];
  }
}

// --- WebChatBot to Discord (instead of RCON) ---
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
    console.error("WebChatBot send error:", error);
  }
}

// --- Discord Listener Bot ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Discord bot ready as ${client.user.tag}`);

  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

client.on("messageCreate", (message) => {
  if (!message.channel || message.channel.name !== MINECRAFT_CHANNEL_NAME)
    return;

  if (message.author.id === webChatClient.user.id) return;

  const image = message.attachments?.first()?.url || null;
  const displayName = message.member?.displayName || message.author.username;
  const formatted = `[${displayName}]: ${message.content}`;

  io.emit("chatMessage", { text: formatted, image });
});

// --- Web Socket Chat Handling ---
io.on("connection", async (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("requestChatHistory", async () => {
    const history = await fetchDiscordChatHistory(100);
    console.log(
      "🔥 Sending chatHistory to client via request:",
      history.length
    );
    socket.emit("chatHistory", history);
  });

  socket.on("sendChatMessage", async (message) => {
    const now = Date.now();
    const lastSent = messageCooldowns[socket.id] || 0;

    if (now - lastSent < 10000) {
      console.log(`Cooldown block for socket: ${socket.id}`);
    }

    messageCooldowns[socket.id] = now;
    console.log(`Web message: ${message}`);

    try {
      await sendToMinecraftChat(message);
    } catch (error) {
      console.error("Failed to send message:", error);
    }

    // 🔄 FIX: send structured message object
    io.emit("chatMessage", {
      text: `${message}`, // or just `message` if you don't want a name
      image: null,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// --- API Routes ---
app.get("/api/playerCount", async (req, res) => {
  try {
    const response = await status(serverIP, serverPort, { timeout: 5000 });
    res.json({ count: response.players.online });
  } catch (error) {
    console.error("Error querying server:", error);
    res.status(500).json({ error: "Failed to fetch player count" });
  }
});

app.get("/api/players", async (req, res) => {
  try {
    const response = await status(serverIP, serverPort, { timeout: 5000 });
    const onlinePlayers = response.players.sample || [];
    const onlineUUIDs = onlinePlayers.map((p) => p.id);

    for (const player of onlinePlayers) {
      await db.query(
        `
        INSERT INTO users (uuid, name, online, last_seen)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (uuid)
        DO UPDATE SET name = $2, online = true, last_seen = NOW()
      `,
        [player.id, player.name]
      );
    }

    if (onlineUUIDs.length > 0) {
      await db.query(
        `
        UPDATE users SET online = false
        WHERE uuid NOT IN (${onlineUUIDs.map((_, i) => `$${i + 1}`).join(",")})
      `,
        onlineUUIDs
      );
    } else {
      await db.query(`UPDATE users SET online = false`);
    }

    const result = await db.query(
      `SELECT uuid as id, name, online, last_seen FROM users ORDER BY online DESC, name`
    );
    res.json({ players: result.rows });
  } catch (error) {
    console.error("Error syncing players:", error);
    res.status(500).json({ error: "Could not fetch players" });
  }
});

app.post("/api/apply", async (req, res) => {
  const { mcName, dcName, age, howFound, experience, whyJoin } = req.body;

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
    res.json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error("Error inserting application:", error);
    res.status(500).json({ error: "Error submitting application" });
  }
});

app.post("/api/wait-list", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const insertQuery = `
      INSERT INTO waitlist_emails (email)
      VALUES ($1)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [email]);
    res.json({ success: true, email: result.rows[0] });
  } catch (error) {
    console.error("Error inserting waitlist email:", error);
    res.status(500).json({ error: "Error submitting email" });
  }
});

//sending images

app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  const file = req.file;
  const messageText = req.body.message || "";

  if (!file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    const guild = await webChatClient.guilds.fetch(
      process.env.DISCORD_GUILD_ID
    );
    const channel = guild.channels.cache.find(
      (ch) => ch.name === MINECRAFT_CHANNEL_NAME
    );

    if (!channel || !channel.isTextBased()) {
      return res.status(500).json({ error: "Channel not found" });
    }

    const attachment = new AttachmentBuilder(file.buffer, {
      name: file.originalname,
    });

    const sentMessage = await channel.send({
      content: messageText,
      files: [attachment],
    });

    const sentAttachment = sentMessage.attachments.first();
    const imageUrl = sentAttachment?.url || null;

    io.emit("chatMessage", {
      text: messageText,
      image: imageUrl,
    });

    return res.json({ success: true, image: imageUrl });
  } catch (err) {
    console.error("Failed to send image to Discord:", err);
    return res.status(500).json({ error: "Failed to send image" });
  }
});

app.get("/*", (req, res) => {
  res.sendFile(path.join(reactBuildPath, "index.html"));
});

client.login(process.env.DISCORD_BOT_TOKEN);
