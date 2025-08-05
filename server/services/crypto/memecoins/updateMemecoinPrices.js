import logger from "../../../logger.js";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { sendCrashNotification } from "../../../discord/notifiers/crypto/crashNotifier.js";
import config from "../../../config/index.js";

/**
 * Simulates price updates for memecoins and handles crashing logic, price alerts,
 * hourly snapshots, and history trimming.
 *
 * - Crashes tokens priced under $0.002
 * - Sends DMs on crash or price alert triggers
 * - Inserts new price and price history records
 * - Cleans up excess history entries
 *
 * @param {import("pg").Pool} db - PostgreSQL pool instance used for DB operations.
 * @param {import("discord.js").Client} clientBot - Discord client instance used for sending DMs to users.
 * @returns {Promise<void>}
 */
const { UPWARD_BIAS, VOLATILITY, CRASH_PRICE_THRESHOLD } = config.memecoins;
const { LIME_GREEN } = config.uiColors;
const { LOW, MID, HIGH } = VOLATILITY;
const PRICE_DECIMALS = 4;
const ALERT_DM_DELAY_MS = 300;

export async function updateMemecoinPrices(db, clientBot, io) {
  try {
    const { rows: tokens } = await db.query(
      `SELECT id, price_per_unit FROM crypto_tokens WHERE is_memecoin = true AND price_per_unit > 0`
    );

    for (const token of tokens) {
      const id = token.id;
      const price = parseFloat(token.price_per_unit);
      if (!Number.isFinite(price)) continue;

      let direction = Math.random() < UPWARD_BIAS ? 1 : -1;
      let changePercent;
      let delta;

      if (price < CRASH_PRICE_THRESHOLD) {
        await db.query(
          `UPDATE crypto_tokens SET price_per_unit = 0, crashed = NOW() WHERE id = $1`,
          [id]
        );
        logger.info(`💀 Token ID ${id} auto-crashed due to price below $0.002`);

        const {
          rows: [crashedToken],
        } = await db.query(
          `SELECT name, symbol, description, price_per_unit, total_supply
           FROM crypto_tokens
           WHERE id = $1`,
          [id]
        );

        const { rows: alerts } = await db.query(
          `SELECT id, discord_id FROM token_price_alerts
           WHERE token_symbol = $1`,
          [crashedToken.symbol]
        );

        for (const alert of alerts) {
          try {
            const user = await clientBot.users.fetch(alert.discord_id);
            await user.send(
              `💀 Your alert for **${crashedToken.symbol}** has been cancelled — the token has **auto-crashed to $0**.`
            );
          } catch (err) {
            logger.warn(
              `⚠️ Failed to send crash alert DM to ${alert.discord_id}: ${err}`
            );
          }
        }

        await db.query(
          `DELETE FROM token_price_alerts WHERE token_symbol = $1`,
          [crashedToken.symbol]
        );

        if (crashedToken) {
          await sendCrashNotification(crashedToken);
        }

        continue;
      }

      if (price < LOW.PRICE_THRESHOLD) {
        changePercent = Math.random() * (LOW.MAX - LOW.MIN) + LOW.MIN;
        delta = price * changePercent * direction;
      } else {
        let maxPercent;
        if (price < MID.PRICE_THRESHOLD) {
          maxPercent = MID.MAX;
        } else if (price < HIGH.PRICE_THRESHOLD) {
          const scale =
            (price - MID.PRICE_THRESHOLD) /
            (HIGH.PRICE_THRESHOLD - MID.PRICE_THRESHOLD);
          maxPercent = MID.MAX - scale * (MID.MAX - HIGH.MAX);
        } else {
          maxPercent = HIGH.MAX;
        }

        changePercent = Math.random() * maxPercent;
        delta = price * changePercent * direction;
      }

      const newPrice = Math.max(0, price + delta);

      await db.query(
        `UPDATE crypto_tokens SET price_per_unit = $1 WHERE id = $2`,
        [newPrice.toFixed(PRICE_DECIMALS), id]
      );

      if (newPrice.toFixed(PRICE_DECIMALS) !== price.toFixed(PRICE_DECIMALS)) {
        const {
          rows: [updatedToken],
        } = await db.query(
          `SELECT id, name, symbol, price_per_unit, available_supply, crashed
     FROM crypto_tokens
     WHERE id = $1`,
          [id]
        );
        io.emit("token:update", updatedToken);
      }

      await db.query(
        `INSERT INTO token_price_history_minutes (token_id, price, recorded_at)
         VALUES ($1, $2, NOW())`,
        [id, newPrice.toFixed(PRICE_DECIMALS)]
      );

      const { rows: alerts } = await db.query(
        `SELECT * FROM token_price_alerts
         WHERE token_symbol = (
           SELECT symbol FROM crypto_tokens WHERE id = $1
         )`,
        [id]
      );

      const triggeredAlerts = alerts.filter((alert) => {
        if (alert.direction === "above") {
          return newPrice >= alert.target_price;
        } else {
          return newPrice <= alert.target_price;
        }
      });

      for (const alert of triggeredAlerts) {
        try {
          const user = await clientBot.users.fetch(alert.discord_id);
          const triggerDirectionText =
            alert.direction === "below" ? "dropped below" : "reached";
          const embed = new EmbedBuilder()
            .setTitle(`📈 ${alert.token_symbol} Price Alert`)
            .setDescription(
              `**${
                alert.token_symbol
              }** has ${triggerDirectionText} your target of **$${newPrice.toFixed(
                PRICE_DECIMALS
              )}**!\n\nYou have been automatically unsubscribed from this alert.`
            )
            .setColor(LIME_GREEN)
            .setFooter({ text: "Createrington Market Alert System" })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("View Market")
              .setStyle(ButtonStyle.Link)
              .setURL("https://create-rington.com/market")
          );

          await user.send({
            embeds: [embed],
            components: [row],
          });

          await db.query(`DELETE FROM token_price_alerts WHERE id = $1`, [
            alert.id,
          ]);

          logger.info(
            `✅ Sent alert to ${alert.discord_id} for ${alert.token_symbol}`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, ALERT_DM_DELAY_MS)
          );
        } catch (error) {
          logger.warn(
            `⚠️ Failed to send alert DM to ${alert.discord_id}: ${error}`
          );
        }
      }

      const { rows } = await db.query(
        `SELECT id FROM token_price_history_minutes
         WHERE token_id = $1
         ORDER BY recorded_at ASC
         LIMIT 1 OFFSET 99`,
        [id]
      );

      const { rowCount } = await db.query(
        `SELECT 1 FROM token_price_history_hourly
         WHERE token_id = $1 AND recorded_at > NOW() - INTERVAL '55 minutes'`,
        [id]
      );

      if (rowCount === 0) {
        await db.query(
          `INSERT INTO token_price_history_hourly (token_id, price, recorded_at)
           VALUES ($1, $2, NOW())`,
          [id, newPrice.toFixed(PRICE_DECIMALS)]
        );
        logger.info(
          `🕐 Hourly snapshot added for memecoin ID ${id}: $${newPrice.toFixed(
            PRICE_DECIMALS
          )}`
        );
      }

      if (rows.length) {
        await db.query(
          `DELETE FROM token_price_history_minutes
           WHERE token_id = $1
           AND id IN (
             SELECT id FROM token_price_history_minutes
             WHERE token_id = $1
             ORDER BY recorded_at ASC
             LIMIT 20
           )`,
          [id]
        );
        logger.info(`🧹 Trimmed 20 old history entries for token ID ${id}`);
      }
    }
  } catch (error) {
    logger.error(`❌ Failed to update memecoin prices: ${error}`);
  }
}
