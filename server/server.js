import express from "express";
import { status } from "minecraft-server-util";
import { Server } from "socket.io";
import pg from "pg";
import bodyParser from "body-parser";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Client, GatewayIntentBits } from "discord.js";
import { Rcon } from "rcon-client";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const messageCooldowns = {};

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

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

async function fetchDiscordChatHistory(limit = 100) {
  try {
    const guild = client.guilds.cache.first(); // or fetch by ID
    const channel = guild.channels.cache.find(
      (ch) => ch.name === MINECRAFT_CHANNEL_NAME
    );

    if (!channel || !channel.isTextBased()) {
      console.log("Channel not found or not text-based.");
      return [];
    }

    const fetched = await channel.messages.fetch({ limit });
    console.log("Fetched messages count:", fetched.size);

    const messagesArray = Array.from(fetched.values())
      .reverse()
      .filter((msg) => {
        if (!msg.author.bot) return true;
        return (
          msg.content.startsWith("[Web]") || msg.content.match(/^`<[^<>]+>`/)
        );
      })
      .map((msg) => {
        const name = msg.member?.displayName || msg.author.username;
        return `[${name}]: ${msg.content}`;
      });

    return messagesArray;
  } catch (err) {
    console.error("Failed to fetch Discord history:", err);
    return [];
  }
}

// --- RCON to Minecraft ---
async function sendToMinecraftChat(message) {
  try {
    const rcon = await Rcon.connect({
      host: process.env.SERVER_IP,
      port: parseInt(process.env.RCON_PORT) || 25575,
      password: process.env.RCON_PASSWORD,
    });

    await rcon.send(`tellraw @a {"text":"[Web] ${message}","color":"gray"}`);
    await rcon.end();
  } catch (error) {
    console.error("RCON Error:", error);
  }
}

// --- Discord Bot ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const MINECRAFT_CHANNEL_NAME = "minecraft-chat";

client.once("ready", () => {
  console.log(`Discord bot ready as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (!message.channel || message.channel.name !== MINECRAFT_CHANNEL_NAME)
    return;
  if (message.author.bot && message.content.startsWith("[Web]")) return;

  const displayName = message.member?.displayName || message.author.username;
  const formatted = `[${displayName}]: ${message.content}`;
  io.emit("chatMessage", formatted);
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
      const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      const channel = guild.channels.cache.find(
        (ch) => ch.name === MINECRAFT_CHANNEL_NAME
      );
      if (channel && channel.isTextBased()) {
        await channel.send(`[Web] ${message}`);
      }

      await sendToMinecraftChat(message);
    } catch (error) {
      console.error("Failed to send message:", error);
    }

    io.emit("chatMessage", `[Web] ${message}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// --- API Routes ---
app.get("/playerCount", async (req, res) => {
  try {
    const response = await status(serverIP, serverPort, { timeout: 5000 });
    res.json({ count: response.players.online });
  } catch (error) {
    console.error("Error querying server:", error);
    res.status(500).json({ error: "Failed to fetch player count" });
  }
});

app.get("/players", async (req, res) => {
  try {
    const response = await status(serverIP, serverPort, { timeout: 5000 });
    const onlinePlayers = response.players.sample || [];

    const onlineUUIDs = onlinePlayers.map((p) => p.id);

    // Update the DB: set current players online
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

    // Set anyone not in the current online list to offline
    await db.query(
      `
      UPDATE users SET online = false
      WHERE uuid NOT IN (${onlineUUIDs.map((_, i) => `$${i + 1}`).join(",")})
    `,
      onlineUUIDs
    );

    // Return all players marked as online
    const result = await db.query(
      `SELECT uuid as id, name, online, last_seen FROM users ORDER BY online DESC, name`
    );
    res.json({ players: result.rows });

    res.json({ players: result.rows });
  } catch (error) {
    console.error("Error syncing players:", error);
    res.status(500).json({ error: "Could not fetch players" });
  }
});

app.post("/apply", async (req, res) => {
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

app.post("/wait-list", async (req, res) => {
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

client.once("ready", () => {
  console.log(`Discord bot ready as ${client.user.tag}`);

  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

client.login(process.env.DISCORD_BOT_TOKEN);
