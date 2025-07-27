import { registerSocketHandlers } from "./handlers/index.js";
import relayDiscordMessages from "./relayDiscordMessages.js";
import logger from "../logger.js";

/**
 * Sets up Socket.IO event handling for new client connections.
 *
 * @param {import("socket.io").Server} io - The Socket.IO server instance.
 * @param {import("pg").Pool} db - PostgreSQL connection pool instance.
 * @param {import("discord.js").Client} client - Discord bot client instance (e.g., clientBot).
 * @param {import("discord.js").Client} webBot - Discord web bot instance used for relaying messages.
 * @returns {void}
 */
export function setupSocketIO(io, db, client, webBot) {
  relayDiscordMessages(client, webBot, io);
  io.on("connection", (socket) => {
    logger.info(`New socket connected: ${socket.id}`);
    registerSocketHandlers(socket, { db, io, client, webBot });
  });
}
