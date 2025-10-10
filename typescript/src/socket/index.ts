import type { Server as SocketIOServer } from "socket.io";
import type { Pool } from "pg";
import type { Client as DiscordClient } from "discord.js";

import { registerSocketHandlers } from "./handlers";
import relayDiscordMessages from "./relay-discord-messages";
import logger from "../logger";

/**
 * Sets up Socket.IO event handling for new client connections.
 */
export function setupSocketIO(
  io: SocketIOServer,
  db: Pool,
  client: DiscordClient,
  webBot: DiscordClient
): void {
  relayDiscordMessages(client, webBot, io);

  io.on("connection", (socket) => {
    logger.info(`New socket connected: ${socket.id}`);
    registerSocketHandlers(socket, { db, io, client, webBot });
  });
}

export default setupSocketIO;
