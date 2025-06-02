import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("pay")
  .setDescription("Pay another player from your balance")
  .addStringOption((option) =>
    option
      .setName("recipient")
      .setDescription("The recipient's Discord mention or Minecraft username")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("The amount to send")
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction, db) {
  const senderDiscordId = interaction.user.id;
  const recipientInput = interaction.options.getString("recipient");
  const amount = interaction.options.getInteger("amount");

  let recipientDiscordId = null;
  let recipientMcName = null;

  const mentionMatch = recipientInput.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    recipientDiscordId = mentionMatch[1];
  } else {
    recipientMcName = recipientInput;
  }

  if (recipientDiscordId === senderDiscordId) {
    return await interaction.reply({
      content: "❌ You cannot pay yourself.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const senderRes = await client.query(
      `SELECT uuid, balance FROM user_funds WHERE discord_id = $1 FOR UPDATE`,
      [senderDiscordId]
    );

    if (senderRes.rowCount === 0) {
      throw new Error("Sender account not found.");
    }

    const { uuid: from_uuid, balance: senderBalance } = senderRes.rows[0];

    if (senderBalance < amount) {
      return await interaction.reply({
        content: "❌ Insufficient funds.",
        flags: MessageFlags.Ephemeral,
      });
    }

    let recipientRes;
    if (recipientDiscordId) {
      recipientRes = await client.query(
        `SELECT uuid, discord_id, name FROM user_funds WHERE discord_id = $1 FOR UPDATE`,
        [recipientDiscordId]
      );
    } else {
      recipientRes = await client.query(
        `SELECT uuid, discord_id, name FROM user_funds WHERE LOWER(name) = LOWER($1) FOR UPDATE`,
        [recipientMcName]
      );
    }

    if (recipientRes.rowCount === 0) {
      throw new Error("Recipient account not found.");
    }

    const {
      uuid: to_uuid,
      discord_id: resolvedDiscordId,
      name: resolvedMcName,
    } = recipientRes.rows[0];

    if (from_uuid === to_uuid) {
      return await interaction.reply({
        content: "❌ You cannot pay yourself.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await client.query(
      `UPDATE user_funds SET balance = balance - $1 WHERE uuid = $2`,
      [amount, from_uuid]
    );

    await client.query(
      `UPDATE user_funds SET balance = balance + $1 WHERE uuid = $2`,
      [amount, to_uuid]
    );

    await db.query(
      `INSERT INTO currency_transactions (uuid, action, amount, from_uuid, to_uuid, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [from_uuid, "pay", amount, from_uuid, to_uuid, senderBalance - amount]
    );

    await client.query("COMMIT");

    const formattedAmount = amount.toLocaleString("en-US");

    let recipientDisplay = resolvedDiscordId
      ? `<@${resolvedDiscordId}> (${resolvedMcName})`
      : resolvedMcName;

    await interaction.reply({
      content: `✅ Successfully sent **$${formattedAmount}** to ${recipientDisplay}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(`❌ /pay command failed: ${logError(error)}`);
    await interaction.reply({
      content: "⚠️ Something went wrong while processing your payment.",
      flags: MessageFlags.Ephemeral,
    });
  } finally {
    client.release();
  }
}
