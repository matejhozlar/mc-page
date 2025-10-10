import type { Socket, Server as SocketIOServer } from "socket.io";
import type { Pool } from "pg";
import type { Client as DiscordClient } from "discord.js";

import chatMessageHandler, { clearCooldown } from "./chat-message";
import requestHistoryHandler from "./request-history";
import disconnectHandler from "./disconnect";

type ChatMessagePayload = {
  message: string;
  token: string;
  authorName?: string;
};

export interface SocketDeps {
  db: Pool;
  io: SocketIOServer;
  client: DiscordClient;
  webBot: DiscordClient;
}

export function registerSocketHandlers(socket: Socket, deps: SocketDeps): void {
  const { db, io, webBot } = deps;

  socket.on("sendChatMessage", (data: ChatMessagePayload) =>
    chatMessageHandler(socket, data, db, io, webBot)
  );

  socket.on("requestChatHistory", () => requestHistoryHandler(socket, webBot));

  socket.on("disconnect", () => {
    clearCooldown(socket);
    disconnectHandler(socket);
  });
}

export default registerSocketHandlers;
