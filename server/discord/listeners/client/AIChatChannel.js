import { askAssistant } from "../../../AI/openaiAssistant.js";
import logger from "../../../logger.js";
import dotenv from "dotenv";
import { exitIfNotProduction } from "../../../utils/production/onlyInProduction.js";

dotenv.config();

const DAILY_LIMIT = 50;

/**
 * Sets up a private-message-only AI chat listener on the Discord client.
 * Users must be registered and under a daily message limit.
 *
 * @param {import('discord.js').Client} client - The Discord.js client instance.
 * @param {{ db: import('pg').Pool }} context - An object containing the PostgreSQL database connection pool.
 */
export default function setupAIChatListener(client, { db }) {
  if (!exitIfNotProduction()) return;

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.type !== 1) return;

    const userId = message.author.id;

    try {
      const userResult = await db.query(
        `SELECT discord_id FROM users WHERE discord_id = $1 LIMIT 1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return message.reply(
          "❌ You are not registered with Createrington. Please apply at <https://create-rington.com>."
        );
      }

      const countResult = await db.query(
        `
        SELECT COUNT(*) FROM ai_message_log
        WHERE discord_id = $1 AND created_at::date = CURRENT_DATE
        `,
        [userId]
      );

      const messageCount = parseInt(countResult.rows[0].count, 10);

      if (messageCount >= DAILY_LIMIT) {
        return message.reply(
          `⛔ You've reached the **daily limit of ${DAILY_LIMIT} AI messages**. Try again tomorrow.`
        );
      }

      await message.channel.sendTyping();
      const response = await askAssistant(message.content);
      await message.reply(response);

      await db.query(
        `INSERT INTO ai_message_log (discord_id, message, created_at)
         VALUES ($1, $2, NOW())`,
        [userId, message.content]
      );
    } catch (error) {
      logger.error("AI Chat Error:", error);
      await message.reply("⚠️ The assistant encountered an error.");
    }
  });
}
