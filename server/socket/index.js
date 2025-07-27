import { registerSocketHandlers } from "./handlers/index.js";
import relayDiscordMessages from "./relayDiscordMessages.js";
import logger from "../logger.js";

export function setupSocketIO(io, db, client, webBot) {
  io.on("connection", (socket) => {
    logger.info(`New socket connected: ${socket.id}`);

    registerSocketHandlers(socket, { db, io, client, webBot });
    relayDiscordMessages(client, webBot, io);
  });
}
