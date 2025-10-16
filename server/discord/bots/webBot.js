import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

// Logger
import logger from "../../logger.js";

// Handlers
import setRotatingStatuses from "../handlers/web/setRotatingStatuses.js";
import rotatingStatuses from "../utils/rotatingStatuses.js";

// Loaders
import { registerWebListeners } from "../loader/listenerWebLoader.js";

// IO Sockets
import { getIO } from "../../socket/io.js";

// Startup notifier
import { sendBotNotification } from "../notifiers/sendBotNotification.js";

dotenv.config();

const webBot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

webBot.once("ready", async () => {
  logger.info("WebBot logged in as", webBot.user.tag);
  setRotatingStatuses(webBot, rotatingStatuses);

  await sendBotNotification(webBot, "🟢 WebBot is now online.");

  try {
    const io = getIO();
    await registerWebListeners(webBot, { io });
  } catch (error) {
    logger.error("Error during bot setup:", error);
  }
});

webBot.login(process.env.WEB_BOT_TOKEN).catch((error) => {
  logger.error("Failed to login WebBot:", error);
});

export default webBot;
