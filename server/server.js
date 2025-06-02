import express from "express";
import { Server } from "socket.io";
import pg from "pg";
import bodyParser from "body-parser";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ActivityType,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import logger from "./logger.js";
import { syncAndImportStats } from "./utils/syncAndImportStats.js";
import { status } from "minecraft-server-util";
import cron from "node-cron";

// config
import { validateEnv } from "./config/validateEnv.js";

//services
import { startPlaytimeTracking } from "./services/playtimeTracker.js";
import { assignTopPlayerRole } from "./services/assignTopTplayerRole.js";
import { assignPlaytimeRole } from "./services/assignPlaytimeRoles.js";
import {
  initStatsChampionsBoard,
  updateStatsChampionsBoard,
} from "./services/statsChampionsBoard.js";
import { runMobLimitCleaner } from "./services/mobLimitCleaner.js";

// utils
import logError from "./utils/logError.js";
import rotatingStatuses from "./utils/rotatingStatuses.js";

// routes
import playersRoutes from "./routes/players.js";
import verifyTokenRoute from "./routes/verifyToken.js";
import formRoutes from "./routes/forms.js";
import uploadImageRoute from "./routes/uploadImage.js";
import discordOAuthRoutes from "./routes/discordOAuth.js";
import userRoutes from "./routes/user.js";
import adminRoutes from "./routes/admin.js";
import gameDataRoutes from "./routes/gameData.js";
import currencyRoutes from "./routes/currencyMod.js";

// listeners
import setupLinkOnlyChannelWatcher from "./discord/listeners/linkOnlyChannelMatcher.js";
import { setupVoteListener } from "./discord/listeners/voteDayManager.js";
import startUpdatingServerStats from "./discord/listeners/updateServerStats.js";
import setupAIChatListener from "./discord/listeners/aiChatChannel.js";

validateEnv();

// Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reactBuildPath = path.join(__dirname, "..", "client", "build");

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

// bot instance for sending messages
import { Client as WebChatClient } from "discord.js";

dotenv.config();
logger.info("✅ Environment variables loaded.");

const app = express();
const port = process.env.PORT;
const messageCooldowns = {};

// cookie parser (admin login)
app.use(cookieParser());

app.use(express.static(reactBuildPath));

app.use(
  cors({
    origin: true,
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
const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

try {
  await db.query("SELECT 1");
  logger.info("📦 Connected to PostgreSQL database.");
} catch (error) {
  logger.error(`❌ Failed to connect to DB: ${logError(error)}`);
  process.exit(1);
}

cron.schedule(
  `30 6 * * *`,
  () => {
    runMobLimitCleaner(db);
  },
  {
    timezone: "Europe/Berlin",
  }
);
logger.info("🕰️ Scheduled mob_limit_reached cleanup job at 6:30 AM CET.");

// server IP, PORT
const serverIP = process.env.SERVER_IP;
const serverPort = 26980;

// let lastWasZero = false;

// async function maybeRunStatSync() {
//   try {
//     const { players } = await status(serverIP, serverPort, { timeout: 5000 });
//     const count = players.online;

//     if (count === 0 && !lastWasZero) {
//       lastWasZero = true;
//       logger.info("📉 0 players online — running stats sync...");
//       await syncAndImportStats(db, logger);
//     } else if (count > 0) {
//       lastWasZero = false;
//     }
//   } catch (error) {
//     logger.error(
//       `❌ Failed to check player count for sync: ${logError(error)}`
//     );
//   }
// }

// setInterval(() => maybeRunStatSync(), 10 * 60 * 1000);

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

// setupVoteListener(webChatClient, io);

webChatClient.once("ready", () => {
  logger.info(`WebChatBot ready as ${webChatClient.user.tag}`);

  // let index = 0;

  // setInterval(() => {
  //   const status = rotatingStatuses[index++ % rotatingStatuses.length];

  //   webChatClient.user.setPresence({
  //     activities: [
  //       {
  //         type: ActivityType.Custom,
  //         name: "custom",
  //         state: status,
  //       },
  //     ],
  //     status: "online",
  //     afk: false,
  //   });
  // }, 60000);
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
        const isWebBot = msg.author.id === webBotId;
        const name = msg.member?.displayName || msg.author.username;
        const image = msg.attachments?.first()?.url || null;

        const text = isWebBot ? msg.content : `[${name}]: ${msg.content}`;

        return { text, image };
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

// setupLinkOnlyChannelWatcher(client);
// setupAIChatListener(client);

// discord bot commands setup
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
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
      await interaction.reply({
        content: "❌ Command failed.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (interaction.isButton() && interaction.customId === "create_ticket") {
    try {
      const guild = interaction.guild;
      const user = interaction.user;

      const existing = await db.query(
        `SELECT * FROM tickets WHERE discord_id = $1 AND status != 'deleted' LIMIT 1`,
        [user.id]
      );

      if (existing.rows.length > 0) {
        await interaction.reply({
          content: `❌ You already have a ticket open: <#${existing.rows[0].channel_id}>`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const { rows } = await db.query(
        `SELECT name FROM users WHERE discord_id = $1 LIMIT 1`,
        [user.id]
      );
      const mcName = rows[0]?.name || "Unknown";

      const result = await db.query(
        `SELECT last_number FROM ticket_counter WHERE id = 1`
      );
      let ticketNumber = result.rows[0].last_number + 1;

      const ticketName = `ticket-${ticketNumber.toString().padStart(4, "0")}`;

      await db.query(
        `UPDATE ticket_counter SET last_number = $1 WHERE id = 1`,
        [ticketNumber]
      );

      const ticketChannel = await guild.channels.create({
        name: ticketName,
        type: 0,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: ["ViewChannel"],
          },
          {
            id: user.id,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
          },
          {
            id: client.user.id,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
          },
        ],
      });

      await db.query(
        `INSERT INTO tickets (ticket_number, discord_id, mc_name, channel_id)
   VALUES ($1, $2, $3, $4)`,
        [ticketNumber, user.id, mcName, ticketChannel.id]
      );

      const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
      const welcomeEmbed = new EmbedBuilder()
        .setDescription(
          `👋 Welcome <@${user.id}> (Minecraft: **${mcName}**)\n\nPlease describe your issue in detail and include any screenshots or videos that may help.\n\nSupport will be with you shortly <@&${adminRoleId}>\nTo close this ticket, press the **Close** button below.`
        )
        .setColor(0x2f3136)
        .addFields({
          name: " ",
          value: "[Createrington](https://create-rington.com)",
        });

      const closeButton = new ButtonBuilder()
        .setCustomId("start_close_ticket")
        .setLabel("Close")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔒");

      const row = new ActionRowBuilder().addComponents(closeButton);

      await ticketChannel.send({
        embeds: [welcomeEmbed],
        components: [row],
      });

      await interaction.reply({
        content: `✅ Your ticket has been created: ${ticketChannel}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error(`❌ Failed to create ticket: ${logError(error)}`);
      await interaction.reply({
        content: "⚠️ Failed to create ticket. Please try again later.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
  if (interaction.isButton() && interaction.customId === "start_close_ticket") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_close_ticket")
        .setLabel("Close")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_close_ticket")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.deferUpdate();
    const confirmationMessage = await interaction.channel.send({
      content: "⚠️ Are you sure you want to close this ticket?",
      components: [confirmRow],
    });
  }

  if (
    interaction.isButton() &&
    interaction.customId === "confirm_close_ticket"
  ) {
    const user = interaction.user;
    const channel = interaction.channel;

    try {
      await interaction.message.delete().catch(console.error);

      const memberId = channel.permissionOverwrites.cache.find(
        (po) => po.allow.has("ViewChannel") && po.type === 1
      )?.id;

      const guildMember = await channel.guild.members.fetch(memberId);

      await channel.permissionOverwrites.edit(memberId, {
        ViewChannel: false,
      });

      const closedBy = `<@${user.id}>`;
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(`Ticket Closed by ${closedBy}`);

      const adminRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_transcript")
          .setLabel("Transcript")
          .setEmoji("📄")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("reopen_ticket")
          .setLabel("Open")
          .setEmoji("🔓")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("delete_ticket")
          .setLabel("Delete")
          .setStyle(ButtonStyle.Danger)
      );

      const adminPanelMessage = await interaction.channel.send({
        embeds: [embed],
        components: [adminRow],
      });

      await db.query(
        `UPDATE tickets SET admin_message_id = $1 WHERE channel_id = $2`,
        [adminPanelMessage.id, interaction.channel.id]
      );
    } catch (error) {
      logger.error(`❌ Failed to close ticket: ${logError(error)}`);
      await interaction.reply({
        content: "❌ Failed to close ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (
    interaction.isButton() &&
    interaction.customId === "cancel_close_ticket"
  ) {
    await interaction.message.delete().catch(console.error);
  }
  if (interaction.isButton() && interaction.customId === "reopen_ticket") {
    const channelId = interaction.channel.id;

    const result = await db.query(
      `SELECT discord_id, admin_message_id FROM tickets WHERE channel_id = $1 LIMIT 1`,
      [channelId]
    );

    const adminMessageId = result.rows[0]?.admin_message_id;

    if (adminMessageId) {
      const msg = await interaction.channel.messages
        .fetch(adminMessageId)
        .catch(() => null);
      if (msg) await msg.delete().catch(() => null);
    }

    try {
      const result = await db.query(
        `SELECT discord_id FROM tickets WHERE channel_id = $1 LIMIT 1`,
        [channelId]
      );

      const originalUserId = result.rows[0]?.discord_id;

      if (originalUserId) {
        await interaction.channel.permissionOverwrites.edit(originalUserId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });

        await db.query(
          `UPDATE tickets SET status = 'open', updated_at = NOW() WHERE channel_id = $1`,
          [channelId]
        );

        await interaction.deferUpdate();
        const reopenedEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(
            `✅ Ticket has been reopened for <@${originalUserId}>`
          );

        await interaction.channel.send({
          embeds: [reopenedEmbed],
        });
      } else {
        await interaction.reply({
          content: "❌ Could not find original ticket owner in the database.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      logger.error(`❌ Failed to reopen ticket: ${logError(error)}`);
      await interaction.reply({
        content: "⚠️ Something went wrong while reopening the ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (interaction.isButton() && interaction.customId === "delete_ticket") {
    await interaction.deferUpdate();

    const channelId = interaction.channel.id;

    const embed = new EmbedBuilder()
      .setDescription("Ticket will be deleted in a few seconds")
      .setColor(0xed4245);

    await interaction.channel.send({ embeds: [embed] });

    await db.query(
      `UPDATE tickets SET status = 'deleted', updated_at = NOW() WHERE channel_id = $1`,
      [channelId]
    );

    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 5000);
  }

  if (interaction.isButton() && interaction.customId === "ticket_transcript") {
    try {
      await interaction.deferUpdate();

      const channelId = interaction.channel.id;
      const transcriptChannelId = process.env.DISCORD_TRANSCRIPT_CHANNEL_ID;
      const guild = interaction.guild;

      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sorted = messages.reverse();
      const contentBody = sorted
        .filter((m) => !m.author.bot)
        .map(
          (m) =>
            `[${m.createdAt.toISOString()}] ${m.author.tag}: ${
              m.content || "[Embed/Attachment]"
            }`
        )
        .join("\n");

      const ticketResult = await db.query(
        `SELECT t.*, u.name AS mc_name 
       FROM tickets t 
       LEFT JOIN users u ON t.discord_id = u.discord_id 
       WHERE t.channel_id = $1 LIMIT 1`,
        [channelId]
      );

      const ticket = ticketResult.rows[0];
      const member = await guild.members
        .fetch(ticket.discord_id)
        .catch(() => null);
      const displayName =
        member?.displayName || `Unknown (${ticket.discord_id})`;

      const transcriptHeader = `Ticket Transcript - ${
        interaction.channel.name
      }\n\nDiscord User: ${displayName} (${
        ticket.discord_id
      })\nMinecraft Username: ${ticket.mc_name || "Unknown"}\nTicket Number: ${
        ticket.ticket_number
      }\nStatus: ${
        ticket.status
      }\nCreated At: ${ticket.created_at?.toISOString()}\nUpdated At: ${ticket.updated_at?.toISOString()}\n\n
------------------------------------------------------------\n\n
`;

      const fullTranscript = transcriptHeader + contentBody;
      const buffer = Buffer.from(fullTranscript, "utf-8");

      const transcriptFile = new AttachmentBuilder(buffer, {
        name: `transcript-${interaction.channel.name}.txt`,
      });

      const transcriptChannel = guild.channels.cache.get(transcriptChannelId);
      if (!transcriptChannel || !transcriptChannel.isTextBased()) {
        logger.warn("❌ Transcript channel not found or not text-based.");
        return;
      }

      await transcriptChannel.send({
        content: `📄 Ticket transcript saved from **${interaction.channel.name}**`,
        files: [transcriptFile],
      });

      const transcriptEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(
          `✅ Transcript has been saved to <#${transcriptChannelId}>`
        );

      await interaction.channel.send({
        embeds: [transcriptEmbed],
      });
    } catch (error) {
      logger.error(`❌ Failed to save/send transcript: ${logError(error)}`);
      await interaction.channel.send({
        content: "⚠️ Failed to generate transcript.",
      });
    }
  }
});

client.once("ready", async () => {
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

  // await initStatsChampionsBoard(
  //   db,
  //   client,
  //   process.env.DISCORD_LEADERBOARDS_CHANNEL_ID
  // );

  // setInterval(() => {
  //   logger.info("🔄 Auto-refreshing stats champions leaderboard...");
  //   updateStatsChampionsBoard(db);
  // }, 60 * 60 * 1000);

  // startUpdatingServerStats(client);
});

// creating a message
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
// /players /playerCount
app.use("/api", playersRoutes(db, serverIP, serverPort));
// /verify-token for chat
app.use("/api", verifyTokenRoute(db));
// /apply-form /waitlist-form
app.use("/api", formRoutes(db, client));
// /upload-image
app.use("/api", uploadImageRoute(io, webChatClient, MINECRAFT_CHANNEL_NAME));
// /discord/callback /discord/callback-game
app.use("/api", discordOAuthRoutes(db));
// /user/me /user/validate
app.use("/api", userRoutes(db));
// /admin/validate /admin/me /admin/rcon /admin/users /admin/vanish-status
app.use("/api", adminRoutes(db));
// /game-data /game-logout
app.use("/api", gameDataRoutes(db));
// /currency/balance /currency/send
app.use("/api", currencyRoutes(db));

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

app.get("/*", (req, res) => {
  res.sendFile(path.join(reactBuildPath, "index.html"));
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
