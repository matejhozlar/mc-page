import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import dotenv from "dotenv";
import { DateTime } from "luxon";
import config from "../../config/index.js";

dotenv.config();

const { DAILY_REWARD_AMOUNT } = config.daily;
const TIMEZONE = "Europe/Berlin";

export const data = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("Claim your daily reward");

export const prodOnly = true;

function getLastReset(now) {
  let resetTime = now.set({ hour: 6, minute: 30, second: 0, millisecond: 0 });
  if (now < resetTime) {
    resetTime = resetTime.minus({ days: 1 });
  }
  return resetTime;
}

export async function execute(interaction, db) {
  const discordId = interaction.user.id;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT uuid, balance FROM user_funds WHERE discord_id = $1 FOR UPDATE`,
      [discordId]
    );
    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return await interaction.reply({
        content: `❌ You don’t have your Minecraft account linked yet. Use **/link <username>** to connect your account.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    const { uuid } = userRes.rows[0];
    const rawBal = userRes.rows[0].balance;
    const currentBal = Math.floor(parseFloat(rawBal));

    const now = DateTime.now().setZone(TIMEZONE);
    const lastReset = getLastReset(now);
    const rewardRes = await client.query(
      `SELECT last_claim_at FROM daily_rewards WHERE discord_id = $1 FOR UPDATE`,
      [discordId]
    );
    if (
      rewardRes.rowCount > 0 &&
      DateTime.fromJSDate(rewardRes.rows[0].last_claim_at).setZone(TIMEZONE) >=
        lastReset
    ) {
      await client.query("ROLLBACK");
      const nextReset = lastReset.plus({ days: 1 });
      const diff = nextReset.diff(now, ["hours", "minutes"]).toObject();
      const hours = Math.floor(diff.hours);
      const minutes = Math.floor(diff.minutes);
      return await interaction.reply({
        content: `⏳ You already claimed your daily reward. Next reset in **${hours}h ${minutes}m**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await client.query(
      `UPDATE user_funds SET balance = balance + $1 WHERE uuid = $2`,
      [DAILY_REWARD_AMOUNT, uuid]
    );
    await client.query(
      `INSERT INTO daily_rewards (discord_id, last_claim_at)
         VALUES ($1, $2)
         ON CONFLICT (discord_id)
         DO UPDATE SET last_claim_at = EXCLUDED.last_claim_at`,
      [discordId, now.toJSDate()]
    );
    await client.query("COMMIT");

    const newBalance = currentBal + DAILY_REWARD_AMOUNT;
    const formattedBalance = newBalance.toLocaleString("en-US");

    return await interaction.reply({
      content:
        `✅ You claimed your daily reward of **$${DAILY_REWARD_AMOUNT}**!\n` +
        `💰 New Balance: **$${formattedBalance}**`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("/daily failed:", error);
    return await interaction.reply({
      content: "⚠️ Something went wrong while claiming your daily reward.",
      flags: MessageFlags.Ephemeral,
    });
  } finally {
    client.release();
  }
}
