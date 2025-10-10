import type { Socket, Server as SocketIOServer } from "socket.io";
import type { Pool } from "pg";
import type { Client as DiscordClient } from "discord.js";
import logger from "../../logger";
import { sendToMinecraftChat } from "../utils/send-to-mc";

type ChatMessagePayload = {
  message: string;
  token: string;
  authorName?: string;
};

const COOLDOWN_MS = 10_000;
const cooldowns: Map<string, number> = new Map();

/**
 * Handles a chat message sent from web client.
 * @param {import("socket.io").Socket} socket
 * @param {{ message: string, token: string, authorName?: string }} data
 * @param {import("pg").Pool} db
 * @param {import("socket.io").Server} io
 * @param {import("discord.js").Client} webBot
 */
export default async function chatMessageHandler(
  socket: Socket,
  data: ChatMessagePayload,
  db: Pool,
  io: SocketIOServer,
  webBot: DiscordClient
): Promise<void> {
  const { message, token, authorName } = data ?? {};
  const now = Date.now();
  const lastSent = cooldowns.get(socket.id) ?? 0;

  if (!message?.trim() || !token?.trim()) return;
  if (now - lastSent < COOLDOWN_MS) return;

  cooldowns.set(socket.id, now);

  try {
    let displayName = authorName?.trim() || "web";

    if (token !== "admin" && token !== "user") {
      const result = await db.query<{ discord_name: string }>(
        `SELECT discord_name
           FROM chat_tokens
          WHERE token = $1
            AND expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        logger.warn("Invalid/expired token");
        return;
      }

      displayName = result.rows[0]?.discord_name || displayName;
    }

    const formattedMessage = `<${displayName}> ${message}`;
    logger.info(`${displayName}: ${message}`);

    await sendToMinecraftChat(formattedMessage, webBot);

    io.emit("chatMessage", {
      text: formattedMessage,
      image: null,
      authorType: "web",
    });
  } catch (error) {
    logger.error("Error sending chat message:", error);
  }
}

export function clearCooldown(socket: Socket): void {
  cooldowns.delete(socket.id);
}
