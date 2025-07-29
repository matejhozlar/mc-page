import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import dotenv from "dotenv";
import { announceLotteryStart } from "../../app/utils/currency/announceLotteryStart.js";
import { startLotteryResolver } from "../../app/utils/currency/lotteryResolver.js";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("lottery")
  .setDescription("Start a new lottery with a given amount")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Amount to start the lottery with (min 10)")
      .setRequired(true)
  );

export const prodOnly = true;

export async function execute(interaction, db) {
  const discordId = interaction.user.id;
  const amount = interaction.options.getInteger("amount");

  if (!amount || amount < 10) {
    return await interaction.reply({
      content: "❌ Minimum amount to start a lottery is 10.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT uuid, name, balance FROM user_funds WHERE discord_id = $1 FOR UPDATE`,
      [discordId]
    );

    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return await interaction.editReply({
        content: "❌ You need to link your Minecraft account first.",
      });
    }

    const { uuid, name, balance } = userRes.rows[0];

    const existing = await client.query(
      `SELECT 1 FROM lottery_participants LIMIT 1`
    );

    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return await interaction.editReply({
        content: "❌ A lottery is already in progress.",
      });
    }

    const currentBalance = Math.floor(parseFloat(balance));
    if (currentBalance < amount) {
      await client.query("ROLLBACK");
      return await interaction.editReply({
        content: "❌ You don't have enough funds.",
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

    await interaction.editReply({
      content: `🎉 You started a new lottery with $${amount}!`,
    });

    // Run side effects async
    announceLotteryStart(name).catch((err) =>
      logger.error("❌ announceLotteryStart failed:", err)
    );
    startLotteryResolver(db).catch((err) =>
      logger.error("❌ startLotteryResolver failed:", err)
    );
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(`❌ /lottery command failed: ${error}`);
    await interaction.editReply({
      content: "⚠️ Something went wrong.",
    });
  } finally {
    client.release();
  }
}
