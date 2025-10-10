import type { Client, Message } from "discord.js";
import { ChannelType } from "discord.js";
import type { Pool } from "pg";
import logger from "../../../logger";
import { exitIfNotProduction } from "../../../utils/production/env-guard";
import { askAssistant } from "../../../AI/openai-assistant";

const DAILY_LIMIT = 50;

type Ctx = { db: Pool };

/**
 * Sets up a private-message-only AI chat listener on the Discord client.
 * Users must be registered and under a daily message limit.
 *
 * @param {import('discord.js').Client} client - The Discord.js client instance.
 * @param {{ db: import('pg').Pool }} context - An object containing the PostgreSQL database connection pool.
 */
export default function setupAIChatListener(client: Client, { db }: Ctx): void {
  if (!exitIfNotProduction()) return;

  client.on("messageCreate", async (message: Message) => {
    try {
      if (message.author.bot) return;
      if (message.channel.type !== ChannelType.DM) return;

      const userId = message.author.id;

      const userResult = await db.query<{ discord_id: string }>(
        `SELECT discord_id FROM users WHERE discord_id = $1 LIMIT 1`,
        [userId]
      );
      if (userResult.rows.length === 0) {
        await message.reply(
          "❌ You are not registered with Createrington. Please apply at <https://create-rington.com>."
        );
        return;
      }

      const countResult = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM ai_message_log
          WHERE discord_id = $1
            AND created_at::date = CURRENT_DATE`,
        [userId]
      );
      const messageCount =
        Number.parseInt(countResult.rows[0]?.count ?? "0", 10) || 0;

      if (messageCount >= DAILY_LIMIT) {
        await message.reply(
          `⛔ You've reached the **daily limit of ${DAILY_LIMIT} AI messages**. Try again tomorrow.`
        );
        return;
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
      logger.error(
        `AI Chat Error: ${error instanceof Error ? error.message : String(error)}`
      );
      try {
        await message.reply("⚠️ The assistant encountered an error.");
      } catch {}
    }
  });
}
