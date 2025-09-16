import logger from "../../logger.js";
import { sendToMinecraftChat } from "../utils/sendToMinecraftChat.js";

const cooldowns = new Map();

/**
 * Handles a chat message sent from web client.
 * @param {import("socket.io").Socket} socket
 * @param {{ message: string, token: string, authorName?: string }} data
 * @param {import("pg").Pool} db
 * @param {import("socket.io").Server} io
 * @param {import("discord.js").Client} webBot
 */
export default async function chatMessageHandler(socket, data, db, io, webBot) {
  const { message, token, authorName } = data;
  const now = Date.now();
  const lastSent = cooldowns.get(socket.id) || 0;

  if (!message || !token) return;
  if (now - lastSent < 10000) return;

  cooldowns.set(socket.id, now);

  try {
    let displayName = authorName || "web";

    if (token !== "admin") {
      const result = await db.query(
        `SELECT discord_name FROM chat_tokens WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        logger.warn("Invalid/expired token");
        return;
      }

      displayName = result.rows[0].discord_name;
    }

    const formattedMessage = `<${displayName}> ${message}`;
    logger.info(`${displayName}: ${message}`);

    await sendToMinecraftChat(formattedMessage, webBot);

    io.emit("chatMessage", {
      text: formattedMessage,
      image: null,
      authorType: "web",
    });
  } catch (err) {
    logger.error(`Error sending chat message: ${err}`);
  }
}

export function clearCooldown(socket) {
  cooldowns.delete(socket.id);
}
