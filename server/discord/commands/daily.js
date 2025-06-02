import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";
import dotenv from "dotenv";
import { DateTime } from "luxon";

dotenv.config();

const DAILY_REWARD_AMOUNT = 50;
const TIMEZONE = "Europe/Berlin";

export const data = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("Claim your daily reward");

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
      return await interaction.reply({
        content: `❌ You don’t have your Minecraft account linked yet. Use **/link <username>** to connect your account.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const { uuid, balance } = userRes.rows[0];

    const now = DateTime.now().setZone(TIMEZONE);
    const today = now.toISODate();

    const rewardRes = await client.query(
      `SELECT last_claim_date FROM daily_rewards WHERE discord_id = $1`,
      [discordId]
    );

    if (rewardRes.rowCount > 0 && rewardRes.rows[0].last_claim_date === today) {
      const nextReset = now
        .plus({ days: 1 })
        .set({ hour: 6, minute: 30, second: 0, millisecond: 0 });

      const diff = nextReset.diff(now, ["hours", "minutes"]).toObject();
      const hours = Math.floor(diff.hours);
      const minutes = Math.floor(diff.minutes);

      await client.query("ROLLBACK");
      return await interaction.reply({
        content: `⏳ You already claimed your daily reward today. Next reset in **${hours}h ${minutes}m**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await client.query(
      `UPDATE user_funds SET balance = balance + $1 WHERE uuid = $2`,
      [DAILY_REWARD_AMOUNT, uuid]
    );

    await client.query(
      `INSERT INTO daily_rewards (discord_id, last_claim_date)
       VALUES ($1, $2)
       ON CONFLICT (discord_id)
       DO UPDATE SET last_claim_date = EXCLUDED.last_claim_date`,
      [discordId, today]
    );

    await client.query("COMMIT");

    const formattedBalance = (balance + DAILY_REWARD_AMOUNT).toLocaleString(
      "en-US"
    );
    await interaction.reply({
      content: `✅ You claimed your daily reward of **$${DAILY_REWARD_AMOUNT}**!\n💰 New Balance: **$${formattedBalance}**`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(`❌ /daily command failed: ${logError(error)}`);
    await interaction.reply({
      content: "⚠️ Something went wrong while claiming your daily reward.",
      flags: MessageFlags.Ephemeral,
    });
  } finally {
    client.release();
  }
}
