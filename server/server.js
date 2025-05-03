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

//services
import { startPlaytimeTracking } from "./services/playtimeTracker.js";
import { assignTopPlayerRole } from "./services/assignTopTplayerRole.js";
import { verifyNotifyStaff } from "./services/verifyNotifyStaff.js";
import { assignPlaytimeRole } from "./services/assignPlaytimeRoles.js";

// image storage
const upload = multer({ storage: multer.memoryStorage() });

// bot instance for sending messages
import { Client as WebChatClient } from "discord.js";

dotenv.config();

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

// server IP, PORT
const serverIP = process.env.SERVER_IP;
const serverPort = 26980;

// start playtime tracking
startPlaytimeTracking(db, serverIP, serverPort);

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
  console.log(`WebChatBot ready as ${webChatClient.user.tag}`);
});

webChatClient.login(process.env.DISCORD_WEB_CHAT_BOT_TOKEN);

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
    console.error("WebChatBot send error:", error);
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

let lastTopPlaytimeUse = 0;
const TOPPLAYTIME_COOLDOWN = 10 * 60 * 1000;

// discord bot commands setup
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // token
  if (interaction.commandName === "token") {
    const token = uuidv4();
    const userId = interaction.user.id;
    const displayName =
      interaction.member?.displayName || interaction.user.username;

    try {
      await db.query(
        `INSERT INTO chat_tokens (token, discord_id, discord_name, expires_at)
         VALUES ($1, $2, $3, NOW() + interval '30 days')
         ON CONFLICT (discord_id)
         DO UPDATE SET token = $1, discord_name = $3, expires_at = NOW() + interval '30 days'`,
        [token, userId, displayName]
      );

      await interaction.reply({
        content: `Here's your token:\n\`${token}\`\n\n✅ It's valid for 30 days.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("Token insert/update failed:", err);
      await interaction.reply({
        content: "❌ Could not generate token. Please try again later.",
        ephemeral: true,
      });
    }
  }

  // link
  if (interaction.commandName === "link") {
    const mcName = interaction.options.getString("mc_name");
    const discordId = interaction.user.id;

    try {
      // First check if Discord ID is already linked to any account
      const existing = await db.query(
        `SELECT name FROM users WHERE discord_id = $1`,
        [discordId]
      );

      if (existing.rowCount > 0) {
        return await interaction.reply({
          content: `❌ You’ve already linked your Discord account to \`${existing.rows[0].name}\`.`,
          ephemeral: true,
        });
      }

      // try to update the specific Minecraft user
      const result = await db.query(
        `UPDATE users SET discord_id = $1 WHERE name = $2 AND discord_id IS NULL RETURNING *`,
        [discordId, mcName]
      );

      if (result.rowCount === 0) {
        await interaction.reply({
          content: "❌ That Minecraft name was not found or is already linked.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `✅ Successfully linked \`${mcName}\` to your Discord account.`,
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error("❌ Failed to link account:", err);
      await interaction.reply({
        content: "⚠️ Something went wrong while linking. Try again later.",
        ephemeral: true,
      });
    }
  }

  // playtime
  if (interaction.commandName === "playtime") {
    const requestedName = interaction.options.getString("mc_name");
    const discordId = interaction.user.id;

    try {
      let userData;

      if (requestedName) {
        // Lookup by Minecraft name
        userData = await db.query(
          `SELECT name, play_time_seconds FROM users WHERE LOWER(name) = LOWER($1)`,
          [requestedName]
        );

        if (userData.rowCount === 0) {
          return await interaction.reply({
            content: `❌ No player found with the name \`${requestedName}\`.`,
            ephemeral: true,
          });
        }
      } else {
        // Lookup by Discord ID
        userData = await db.query(
          `SELECT name, play_time_seconds FROM users WHERE discord_id = $1`,
          [discordId]
        );

        if (userData.rowCount === 0) {
          return await interaction.reply({
            content: `❌ You don’t have your Minecraft account linked yet. Use **/link <username>** to connect your account.`,
            ephemeral: true,
          });
        }
      }

      const { play_time_seconds, name } = userData.rows[0] || {};
      if (!play_time_seconds) {
        return await interaction.reply({
          content: `⏳ No playtime recorded yet for **${name}**.`,
          ephemeral: true,
        });
      }

      const hours = Math.floor(play_time_seconds / 3600);
      const minutes = Math.floor((play_time_seconds % 3600) / 60);

      return await interaction.reply({
        content: `🕹️ **${name}** has played for **${hours}h ${minutes}m** in total.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("❌ Failed to fetch playtime:", err);
      return await interaction.reply({
        content:
          "⚠️ Something went wrong while fetching playtime. Please try again later.",
        ephemeral: true,
      });
    }
  }

  // top-playtime
  if (interaction.commandName === "top-playtime") {
    const now = Date.now();
    const remaining = TOPPLAYTIME_COOLDOWN - (now - lastTopPlaytimeUse);

    if (remaining > 0) {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      return await interaction.reply({
        content: `⏳ Please wait **${mins}m ${secs}s** before using this command again.`,
        ephemeral: true,
      });
    }

    lastTopPlaytimeUse = now;

    try {
      const topPlayers = await db.query(
        `SELECT name, play_time_seconds
         FROM users
         WHERE play_time_seconds IS NOT NULL
         ORDER BY play_time_seconds DESC
         LIMIT 10`
      );

      if (topPlayers.rowCount === 0) {
        return await interaction.reply({
          content: "📉 No playtime data found yet!",
          ephemeral: true,
        });
      }

      const formattedList = topPlayers.rows
        .map((player, index) => {
          const hours = Math.floor(player.play_time_seconds / 3600);
          const minutes = Math.floor((player.play_time_seconds % 3600) / 60);
          return `**#${index + 1}** – \`${
            player.name
          }\` • 🕒 ${hours}h ${minutes}m`;
        })
        .join("\n");

      return await interaction.reply({
        content: `🏆 **Top 10 Most Active Players**\n\n${formattedList}`,
        ephemeral: false,
      });
    } catch (err) {
      console.error("❌ Failed to fetch leaderboard:", err);
      return await interaction.reply({
        content: "⚠️ Couldn’t load leaderboard. Try again later.",
        ephemeral: true,
      });
    }
  }

  // register
  if (interaction.commandName === "register") {
    const mcName = interaction.options.getString("mc_name");
    const discordId = interaction.user.id;
    const member = interaction.member;

    const hasUnverified = member.roles.cache.has(
      process.env.DISCORD_UNVERIFIED_ROLE_ID
    );

    if (!hasUnverified) {
      return await interaction.reply({
        content: "❌ You are already verified or not eligible to register.",
        ephemeral: true,
      });
    }

    const verifiedCheck = await db.query(
      `SELECT * FROM verified_discords WHERE discord_id = $1`,
      [discordId]
    );

    if (verifiedCheck.rowCount === 0) {
      return await interaction.reply({
        content:
          "🚫 You haven't verified your token yet. Run `/verify <token>` first.",
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: "🔍 Initiating registration sequence...",
      ephemeral: true,
    });

    try {
      await randomDelay();
      await interaction.editReply({
        content: "📡 Checking Minecraft username existence...",
      });

      const response = await fetch(
        `https://api.mojang.com/users/profiles/minecraft/${mcName}`
      );
      if (!response.ok) {
        await verifyNotifyStaff(
          interaction,
          "Invalid Minecraft username (not found in Mojang API)",
          mcName
        );
        return await interaction.editReply({
          content: `❌ No Minecraft account found with the name \`${mcName}\`. Please double-check your spelling.\n💬 A staff member has been notified and will assist you shortly.`,
        });
      }

      const { id: uuid, name: correctName } = await response.json();

      await randomDelay();
      await interaction.editReply({
        content: "🧠 Checking if your account is already registered...",
      });

      const exists = await db.query("SELECT * FROM users WHERE uuid = $1", [
        uuid,
      ]);
      if (exists.rowCount > 0) {
        await verifyNotifyStaff(
          interaction,
          "UUID already registered",
          mcName,
          uuid
        );
        return await interaction.editReply({
          content: `❌ This Minecraft account (\`${correctName}\`) is already registered.\n💬 A staff member has been notified and will assist you shortly.`,
        });
      }

      await randomDelay();
      await interaction.editReply({
        content: "🔑 Adding you to the whitelist...",
      });

      const rcon = await Rcon.connect({
        host: process.env.SERVER_IP,
        port: parseInt(process.env.RCON_PORT),
        password: process.env.RCON_PASSWORD,
      });

      await rcon.send(`whitelist add ${correctName}`);
      await rcon.end();

      await randomDelay();
      await interaction.editReply({
        content: "💾 Saving your information to the database...",
      });

      await db.query(
        `INSERT INTO users (uuid, name, discord_id, online, last_seen, session_start)
         VALUES ($1, $2, $3, false, NULL, NULL)`,
        [uuid, correctName, discordId]
      );

      await db.query(`DELETE FROM verified_discords WHERE discord_id = $1`, [
        discordId,
      ]);

      await randomDelay();
      await interaction.editReply({
        content: "🛠️ Finalizing your registration...",
      });

      const guildMember = await interaction.guild.members.fetch(discordId);
      await guildMember.roles.remove(process.env.DISCORD_UNVERIFIED_ROLE_ID);
      await guildMember.roles.add(process.env.DISCORD_PLAYER_ROLE_ID);

      const verifyChannel = interaction.guild.channels.cache.get(
        process.env.DISCORD_VERIFY_CHANNEL_ID
      );
      if (verifyChannel?.isTextBased()) {
        const messages = await verifyChannel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter(
          (m) =>
            m.author.id === client.user.id ||
            m.author.id === interaction.user.id
        );
        await Promise.all(
          botMessages.map((msg) => msg.delete().catch(() => {}))
        );
      }

      await randomDelay();
      await interaction.editReply({
        content: `✅ **Done!** You've been successfully registered and whitelisted as \`${correctName}\`. Welcome aboard! 🚂`,
      });
    } catch (err) {
      console.error("❌ Register command failed:", err);
      await verifyNotifyStaff(
        interaction,
        `Unexpected Error: ${err.message}`,
        mcName
      );
      await interaction.editReply({
        content:
          "⚠️ Something went wrong. Please try again later or contact staff.\n💬 A staff member has been notified and will assist you shortly.",
      });
    }
  }

  if (interaction.commandName === "verify") {
    const token = interaction.options.getString("token");
    const discordId = interaction.user.id;
    const member = interaction.member;

    const hasUnverified = member.roles.cache.has(
      process.env.DISCORD_UNVERIFIED_ROLE_ID
    );

    if (!hasUnverified) {
      return await interaction.reply({
        content: "❌ You are already verified or not eligible to register.",
        ephemeral: true,
      });
    }

    const result = await db.query(
      `SELECT * FROM waitlist_emails WHERE token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return await interaction.reply({
        content:
          "❌ Invalid or expired token.\n📧 If you're stuck, email **admin@create-rington.com** for help.",
        ephemeral: true,
      });
    }

    // Delete the token so it can't be reused
    await db.query(`DELETE FROM waitlist_emails WHERE token = $1`, [token]);

    // Optionally store verified Discord ID to make /register validation cleaner
    await db.query(
      `INSERT INTO verified_discords (discord_id)
       VALUES ($1)
       ON CONFLICT (discord_id) DO NOTHING`,
      [discordId]
    );

    return await interaction.reply({
      content:
        "✅ Token verified! You may now use `/register <mc_name>` to join the server.",
      ephemeral: true,
    });
  }
});

client.once("ready", () => {
  console.log(`Discord bot ready as ${client.user.tag}`);

  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
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
  console.log(`Socket connected: ${socket.id}`);

  socket.on("requestChatHistory", async () => {
    const history = await fetchDiscordChatHistory(100);
    console.log(
      "🔥 Sending chatHistory to client via request:",
      history.length
    );
    socket.emit("chatHistory", history);
  });

  socket.on("sendChatMessage", async (data) => {
    const { message, token, authorName } = data;

    const now = Date.now();
    const lastSent = messageCooldowns[socket.id] || 0;

    if (!message || !token) {
      console.warn("⛔ Missing message or token from client");
      return;
    }

    if (now - lastSent < 10000) {
      console.log(`⏳ Cooldown block for socket: ${socket.id}`);
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
          console.warn("⛔ Invalid or expired token");
          return;
        }

        displayName = authorName || result.rows[0].discord_name;
      }

      const formattedMessage = `<${displayName}> ${message}`;

      console.log(`✅ Authenticated message from ${displayName}: ${message}`);

      await sendToMinecraftChat(formattedMessage);

      io.emit("chatMessage", {
        text: formattedMessage,
        image: null,
        authorType: "web",
      });
    } catch (err) {
      console.error("❌ Error handling chat message:", err);
    }
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

// fetching online players
app.get("/players", async (req, res) => {
  try {
    const response = await status(serverIP, serverPort, { timeout: 5000 });
    const onlinePlayers = response.players.sample || [];

    for (const player of onlinePlayers) {
      await db.query(
        `
        INSERT INTO users (uuid, name)
        VALUES ($1, $2)
        ON CONFLICT (uuid) DO NOTHING
      `,
        [player.id, player.name]
      );
    }

    // Fetch all player data for the frontend (excluding players with NULL last_seen)
    const result = await db.query(
      `SELECT uuid as id, name, online, last_seen, play_time_seconds, session_start
       FROM users
       WHERE last_seen IS NOT NULL
       ORDER BY online DESC, name`
    );

    res.json({ players: result.rows });
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Could not fetch players" });
  }
});

// token verification
app.post("/verify-token", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: "Missing token" });
  }

  try {
    const result = await db.query(
      `SELECT discord_id, discord_name FROM chat_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: "Token expired or invalid" });
    }

    const user = result.rows[0];

    return res.json({
      success: true,
      user: {
        id: user.discord_id,
        name: user.discord_name,
      },
    });
  } catch (err) {
    console.error("Token verification failed:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

// aply form
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

// waitlist form
app.post("/wait-list", async (req, res) => {
  const { email, discordName } = req.body;

  if (!email || !discordName) {
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

    res.json({ success: true, entry: result.rows[0] });
  } catch (error) {
    console.error("Error inserting waitlist entry:", error);
    res.status(500).json({
      error:
        "Error submitting waitlist entry.\nIf you're having trouble, contact admin@create-rington.com",
    });
  }
});

//sending images from WEB
app.post("/upload-image", upload.single("image"), async (req, res) => {
  const file = req.file;
  const messageText = req.body.message || "";
  const authorName = req.body.authorName || "web";

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

    io.emit("chatMessage", {
      text: formattedMessage,
      image: imageUrl,
      authorType: "web",
    });

    return res.json({ success: true, image: imageUrl });
  } catch (err) {
    console.error("Failed to send image to Discord:", err);
    return res.status(500).json({ error: "Failed to send image" });
  }
});

// callback for discord login
const ADMIN_ID = process.env.ADMIN_DISCORD_ID;

app.post("/api/discord/callback", async (req, res) => {
  const code = req.body.code;

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

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const user = userRes.data;

    const isAdmin = user.id === ADMIN_ID;

    // Don't let unauthorized users in
    if (!isAdmin) {
      return res.status(403).json({ error: "Not an admin." });
    }

    res.cookie("admin_session", user.id, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OAuth error" });
  }
});

// validate admin
app.get("/api/admin/validate", async (req, res) => {
  const discordId = req.cookies.admin_session;

  if (discordId !== process.env.ADMIN_DISCORD_ID) {
    return res.status(400).json({ valid: false });
  }
  res.json({ valid: true });
});

// admin logout
app.post("/api/admin/logout", (req, res) => {
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

  if (!discordId || discordId !== process.env.ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const result = await db.query(`SELECT * FROM users WHERE discord_id = $1`, [
      discordId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found in database" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to fetch user data: ", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/rcon", async (req, res) => {
  const { command } = req.body;
  const adminId = req.cookies.admin_session;

  if (adminId !== process.env.ADMIN_DISCORD_ID) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  try {
    const userRes = await db.query(
      `SELECT name FROM users WHERE discord_id = $1`,
      [adminId]
    );

    const adminMcName = userRes.rows[0]?.name || "unknown";
    const rcon = await Rcon.connect({
      host: process.env.SERVER_IP,
      port: parseInt(process.env.RCON_PORT),
      password: process.env.RCON_PASSWORD,
    });

    const response = await rcon.send(command);
    await rcon.end();

    // Log the command
    await db.query(
      `INSERT INTO rcon_logs (discord_id, mc_name, command) VALUES ($1, $2, $3)`,
      [adminId, adminMcName, command]
    );

    return res.json({ success: true, response });
  } catch (err) {
    console.error("RCON error:", err);
    return res.status(500).json({ success: false, error: "RCON failure" });
  }
});

// player tabs
app.get("/api/admin/users", async (req, res) => {
  const adminId = req.cookies.admin_session;
  if (adminId !== process.env.ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const result = await db.query(
      `SELECT uuid, name, play_time_seconds, last_seen, online FROM users ORDER BY name ASC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// auto add unverified role on join
client.on("guildMemberAdd", async (member) => {
  const unverifiedRoleId = process.env.DISCORD_UNVERIFIED_ROLE_ID;
  const verifyChannelId = process.env.DISCORD_VERIFY_CHANNEL_ID;

  try {
    await member.roles.add(unverifiedRoleId);
    console.log(`✅ Assigned Unverified role to ${member.user.tag}`);

    const channel = member.guild.channels.cache.get(verifyChannelId);
    if (channel?.isTextBased()) {
      await channel.send(
        `👋 Welcome <@${member.user.id}> to **Createrington**!\n\n🔑 **First Step:** You must verify your **access token**.\nPlease type: \`/verify <your_token>\`\n\n📬 Your token was sent to your email when you applied to join. Check your inbox (and spam folder)!\n\n⚡ **After verifying**, you can then use: \`/register <your_minecraft_username>\`\n(Example: \`/register Notch\`)\n\n⚠️ **Important:**\n- \`mc_name\` means your exact **Minecraft username** (correct spelling, capitalization doesn't matter).\n- **Fake usernames** or **wrong tokens** will block your access.\n\n🎉 We're excited to have you join us — see you in-game soon!`
      );
    }
  } catch (error) {
    console.error(`❌ Error assigning role or sending message:`, error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
