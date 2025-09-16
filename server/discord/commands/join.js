import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Join the active lottery with a specific amount")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Amount to enter into the lottery (min 10)")
      .setRequired(true)
  );

export const prodOnly = true;

export async function execute(interaction, db) {
  const discordId = interaction.user.id;
  const amount = interaction.options.getInteger("amount");

  if (!amount || amount < 10) {
    return await interaction.reply({
      content: "❌ Minimum amount to join the lottery is 10.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT uuid, name, balance FROM user_funds WHERE discord_id = $1 FOR UPDATE`,
      [discordId]
    );

    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return await interaction.reply({
        content:
          "❌ You need to link your Minecraft account first with **/link <username>**.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const { uuid, name, balance } = userRes.rows[0];

    const activeLottery = await client.query(
      `SELECT id FROM lottery_participants LIMIT 1`
    );

    if (activeLottery.rowCount === 0) {
      await client.query("ROLLBACK");
      return await interaction.reply({
        content: "❌ No active lottery is currently running.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const alreadyJoined = await client.query(
      `SELECT 1 FROM lottery_participants WHERE uuid = $1`,
      [uuid]
    );

    if (alreadyJoined.rowCount > 0) {
      await client.query("ROLLBACK");
      return await interaction.reply({
        content: "❌ You've already joined the current lottery.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const currentBalance = Math.floor(parseFloat(balance));
    if (currentBalance < amount) {
      await client.query("ROLLBACK");
      return await interaction.reply({
        content: "❌ You don't have enough funds to join the lottery.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await client.query(
      `UPDATE user_funds SET balance = balance - $1 WHERE uuid = $2`,
      [amount, uuid]
    );

    await client.query(
      `INSERT INTO lottery_participants (uuid, name, amount) VALUES ($1, $2, $3)`,
      [uuid, name, amount]
    );

    await client.query("COMMIT");
    return await interaction.reply({
      content: `🎉 Successfully joined the lottery with $${amount}!`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(`/join command failed: ${error}`);
    return await interaction.reply({
      content: "⚠️ Something went wrong while joining the lottery.",
      flags: MessageFlags.Ephemeral,
    });
  } finally {
    client.release();
  }
}
