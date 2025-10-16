import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";

import logger from "../../logger.js";

// Handlers
import { ticketHandlers } from "../handlers/client/ticket/index.js";
import registerClientInteractionHandler from "../handlers/client/clientInteractionHandler.js";

// Loaders
import { loadCommandHandlers } from "../loader/commandLoader.js";
import { registerClientListeners } from "../loader/listenerClientLoader.js";

// Events
import onGuilderMemberAdd from "../events/client/onGuildMemberAdd.js";

import setupClientBot from "../../bootstrap/setupClientBot.js";
import db from "../../db/index.js";

dotenv.config();

const clientBot = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

clientBot.once("ready", async () => {
  logger.info("ClientBot logged in as", clientBot.user.tag);

  try {
    await setupClientBot(db, clientBot);
    await registerClientListeners(clientBot, { db });
  } catch (error) {
    logger.error("Error during bot setup:", error);
  }
});

clientBot.on("guildMemberAdd", onGuilderMemberAdd);

(async () => {
  const commandHandlers = await loadCommandHandlers();
  registerClientInteractionHandler(clientBot, commandHandlers, ticketHandlers);

  await clientBot.login(process.env.CLIENT_BOT_TOKEN);
})().catch((error) => {
  logger.error("Failed to initialize ClientBot:", error);
});

export default clientBot;
