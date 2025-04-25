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

//services
import { startPlaytimeTracking } from "./services/playtimeTracker.js";
import { assignTopPlayerRole } from "./services/assignTopTplayerRole.js";

const upload = multer({ storage: multer.memoryStorage() });

// bot instance for sending messages
import { Client as WebChatClient } from "discord.js";

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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

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
});

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
      const result = await db.query(
        `SELECT discord_name FROM chat_tokens WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        console.warn("⛔ Invalid or expired token");
        return;
      }

      const displayName = authorName || result.rows[0].discord_name;
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

    // Fetch all player data for the frontend
    const result = await db.query(
      `SELECT uuid as id, name, online, last_seen, play_time_seconds, session_start
       FROM users ORDER BY online DESC, name`
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

//sending images

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

client.on("guildMemberAdd", async (member) => {
  const unverifiedRoleId = process.env.DISCORD_UNVERIFIED_ROLE_ID;
  const verifyChannelId = process.env.DISCORD_VERIFY_CHANNEL_ID;

  try {
    await member.roles.add(unverifiedRoleId);
    console.log(`✅ Assigned Unverified role to ${member.user.tag}`);

    const channel = member.guild.channels.cache.get(verifyChannelId);
    if (channel?.isTextBased()) {
      channel.send(
        `👋 Welcome <@${member.user.id}> to the server!\n\n🛡️ To **gain access**, you need to register your **Minecraft username** first.\nPlease type: \`/register <your_mc_name>\`\n(Example: \`/register Notch\`)\n\n⚠️ **Important:**\n- \`mc_name\` means **your exact Minecraft username**, spelled correctly (capitalization doesn't matter, but spelling does).\n- **No random words** or fake names — if the username is wrong, you won't be able to join!\n\n🏰 See you in-game soon!`
      );
    }
  } catch (error) {
    console.error(`❌ Error assigning role or sending message:`, error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
