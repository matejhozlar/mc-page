import type { Client, Snowflake } from "discord.js";
import logger from "../../../logger";
import { exitIfNotProduction } from "../../../utils/production/env-guard";

function canSend(
  x: unknown
): x is { send: (content: string) => Promise<unknown> } {
  return !!x && typeof (x as any).send === "function";
}

/**
 * Sends a daily reminder message to the configured Minecraft channel.
 * Only runs in production environment.
 */
export async function sendDailyReminder(client: Client): Promise<void> {
  if (!exitIfNotProduction()) return;

  const channelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID as
    | Snowflake
    | undefined;
  if (!channelId) {
    logger.warn("DISCORD_MINECRAFT_CHAT_CHANNEL_ID is not set.");
    return;
  }

  const message =
    "💡 Don't forget to do /daily for rewards and complete quests to earn PLC token!";

  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (channel && channel.isTextBased() && canSend(channel)) {
      await channel.send(message);
      logger.info(`Sent daily reminder to channel ${channelId}`);
    } else {
      logger.warn(
        `Channel ${channelId} is not text-based or doesn't support sending.`
      );
    }
  } catch (error) {
    logger.error(
      `Failed to send daily reminder: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export default sendDailyReminder;
