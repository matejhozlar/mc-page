import { SlashCommandBuilder, MessageFlags } from "discord.js";
import logger from "../../logger.js";
import { getCooldownStatus } from "../../app/utils/crypto/isOnCooldown.js";

export const data = new SlashCommandBuilder()
  .setName("market")
  .setDescription("Buy or sell tokens on the Createrington market")
  .addSubcommand((sub) =>
    sub
      .setName("buy")
      .setDescription("Buy a token by its symbol")
      .addStringOption((option) =>
        option
          .setName("symbol")
          .setDescription("Symbol of the token to buy (e.g. DOGE)")
          .setRequired(true)
      )
      .addNumberOption((option) =>
        option
          .setName("amount")
          .setDescription("Amount of tokens to buy")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("sell")
      .setDescription("Sell a token by its symbol")
      .addStringOption((option) =>
        option
          .setName("symbol")
          .setDescription("Symbol of the token to sell (e.g. DOGE)")
          .setRequired(true)
      )
      .addNumberOption((option) =>
        option
          .setName("amount")
          .setDescription("Amount of tokens to sell")
          .setRequired(true)
      )
  );

export const prodOnly = true;

export async function execute(interaction, db) {
  const subcommand = interaction.options.getSubcommand();
  const tokenSymbol = interaction.options.getString("symbol");
  const amount = interaction.options.getNumber("amount");
  const userId = interaction.user.id;

  if (!tokenSymbol || isNaN(amount) || amount <= 0) {
    return await interaction.reply({
      content: "❌ Invalid token symbol or amount.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const tokenResult = await db.query(
    `SELECT id, symbol FROM crypto_tokens WHERE LOWER(symbol) = LOWER($1)`,
    [tokenSymbol]
  );
  if (!tokenResult.rowCount) {
    return await interaction.reply({
      content: `❌ Token \`${tokenSymbol}\` not found.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const token = tokenResult.rows[0];

  const { onCooldown, secondsRemaining } = await getCooldownStatus(
    db,
    userId,
    token.id
  );
  if (onCooldown) {
    return await interaction.reply({
      content: `⏳ Please wait ${secondsRemaining}s before transacting with \`${token.symbol}\` again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    if (subcommand === "buy") {
      await handleBuy(interaction, db, userId, token.symbol, amount);
    } else if (subcommand === "sell") {
      await handleSell(interaction, db, userId, token.symbol, amount);
    }
  } catch (error) {
    logger.error(`❌ /market ${subcommand} failed: ${error}`);
    return await interaction.reply({
      content: `⚠️ Failed to ${subcommand} tokens. Please try again later.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleBuy(interaction, db, userId, tokenSymbol, amount) {
  const floatAmount = parseFloat(amount);

  const userResult = await db.query(
    `SELECT balance FROM user_funds WHERE discord_id = $1`,
    [userId]
  );
  if (!userResult.rowCount) throw new Error("User funds not found");
  const balance = parseFloat(userResult.rows[0].balance);

  const tokenResult = await db.query(
    `SELECT id, symbol, price_per_unit, available_supply, is_memecoin
     FROM crypto_tokens
     WHERE LOWER(symbol) = LOWER($1)`,
    [tokenSymbol]
  );
  if (!tokenResult.rowCount) {
    return await interaction.reply({
      content: `❌ Token \`${tokenSymbol}\` not found.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const token = tokenResult.rows[0];
  const tokenDbId = token.id;

  if (token.symbol === "PLC") {
    return await interaction.reply({
      content: "❌ The PLC token is not purchasable.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const price = parseFloat(token.price_per_unit);
  const totalCost = price * floatAmount;
  const taxRate = token.is_memecoin ? 0.05 : 0;
  const taxedCost = totalCost * (1 + taxRate);

  if (taxedCost > balance) {
    return await interaction.reply({
      content: "❌ Insufficient funds including tax.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (floatAmount > token.available_supply) {
    return await interaction.reply({
      content: "❌ Not enough tokens available.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await db.query("BEGIN");

  try {
    await db.query(
      `UPDATE user_funds SET balance = balance - $1 WHERE discord_id = $2`,
      [taxedCost, userId]
    );

    if (token.is_memecoin) {
      const taxAmount = taxedCost - totalCost;
      await db.query(
        `UPDATE memecoin_tax_tracker SET total_collected = total_collected + $1 WHERE id = 1`,
        [taxAmount]
      );
    }

    await db.query(
      `UPDATE crypto_tokens SET available_supply = available_supply - $1 WHERE id = $2`,
      [floatAmount, tokenDbId]
    );

    await db.query(
      `INSERT INTO user_tokens (discord_id, token_id, amount, price_at_purchase)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (discord_id, token_id)
       DO UPDATE SET amount = user_tokens.amount + $3, price_at_purchase = $4`,
      [userId, tokenDbId, floatAmount, price]
    );

    await db.query(
      `INSERT INTO token_transactions (discord_id, token_id, amount, price_at_transaction, type)
       VALUES ($1, $2, $3, $4, 'buy')`,
      [userId, tokenDbId, floatAmount, price]
    );

    await db.query("COMMIT");

    await interaction.reply({
      content: `✅ You bought **${floatAmount} ${
        token.symbol
      }** for $${taxedCost.toFixed(2)}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}

async function handleSell(interaction, db, userId, tokenSymbol, amount) {
  const floatAmount = parseFloat(amount);

  const tokenResult = await db.query(
    `SELECT id, symbol, price_per_unit, is_memecoin
     FROM crypto_tokens
     WHERE LOWER(symbol) = LOWER($1)`,
    [tokenSymbol]
  );

  if (!tokenResult.rowCount) {
    return await interaction.reply({
      content: `❌ Token \`${tokenSymbol}\` not found.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const token = tokenResult.rows[0];
  const tokenDbId = token.id;

  const userTokenResult = await db.query(
    `SELECT amount FROM user_tokens WHERE discord_id = $1 AND token_id = $2`,
    [userId, tokenDbId]
  );

  if (
    !userTokenResult.rowCount ||
    floatAmount > parseFloat(userTokenResult.rows[0].amount)
  ) {
    return await interaction.reply({
      content: "❌ You don’t have enough tokens to sell.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const price = parseFloat(token.price_per_unit);
  const grossGain = price * floatAmount;
  const taxRate = token.is_memecoin ? 0.05 : 0;
  const netGain = grossGain * (1 - taxRate);
  const taxAmount = grossGain - netGain;

  await db.query("BEGIN");

  try {
    await db.query(
      `UPDATE user_funds SET balance = balance + $1 WHERE discord_id = $2`,
      [netGain, userId]
    );

    if (token.is_memecoin) {
      await db.query(
        `UPDATE memecoin_tax_tracker SET total_collected = total_collected + $1 WHERE id = 1`,
        [taxAmount]
      );
    }

    await db.query(
      `UPDATE crypto_tokens SET available_supply = available_supply + $1 WHERE id = $2`,
      [floatAmount, tokenDbId]
    );

    await db.query(
      `UPDATE user_tokens SET amount = amount - $1 WHERE discord_id = $2 AND token_id = $3`,
      [floatAmount, userId, tokenDbId]
    );

    await db.query(
      `DELETE FROM user_tokens WHERE amount <= 0 AND discord_id = $1 AND token_id = $2`,
      [userId, tokenDbId]
    );

    await db.query(
      `INSERT INTO token_transactions (discord_id, token_id, amount, price_at_transaction, type)
       VALUES ($1, $2, $3, $4, 'sell')`,
      [userId, tokenDbId, floatAmount, price]
    );

    await db.query("COMMIT");

    await interaction.reply({
      content: `✅ You sold **${floatAmount} ${
        token.symbol
      }** for $${netGain.toFixed(2)}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}
