import logger from "../../logger.js";
import logError from "../../utils/logError.js";

// utils
import { sendCrashNotification } from "../../discord/notifiers/crashNotifier.js";

export async function updateMemecoinPrices(db) {
  try {
    const { rows: tokens } = await db.query(
      `SELECT id, price_per_unit FROM crypto_tokens WHERE is_memecoin = true AND price_per_unit > 0`
    );

    for (const token of tokens) {
      const id = token.id;
      const price = parseFloat(token.price_per_unit);
      if (!Number.isFinite(price)) continue;

      let direction;
      if (price < 5) {
        direction = Math.random() < 0.6 ? -1 : 1;
      } else {
        direction = Math.random() < 0.5 ? -1 : 1;
      }
      let delta;

      if (price < 5) {
        const randomStep = Math.random() * (0.5 - 0.25) + 0.25;
        delta = randomStep * direction;
      } else {
        const changePercent = Math.random() * 0.1;
        delta = price * changePercent * direction;
      }

      const newPrice = Math.max(0, price + delta);

      await db.query(
        `UPDATE crypto_tokens SET price_per_unit = $1 WHERE id = $2`,
        [newPrice.toFixed(4), id]
      );

      await db.query(
        `INSERT INTO token_price_history_minutes (token_id, price, recorded_at)
         VALUES ($1, $2, NOW())`,
        [id, newPrice.toFixed(4)]
      );

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
          [id, newPrice.toFixed(4)]
        );
        logger.info(
          `🕐 Hourly snapshot added for memecoin ID ${id}: $${newPrice.toFixed(
            4
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

      if (newPrice === 0) {
        await db.query(
          `UPDATE crypto_tokens
     SET crashed = NOW()
     WHERE id = $1`,
          [id]
        );
        logger.info(`💀 Token ID ${id} crashed to $0 and marked as crashed`);

        const {
          rows: [crashedToken],
        } = await db.query(
          `SELECT name, symbol, description, price_per_unit, total_supply
     FROM crypto_tokens
     WHERE id = $1`,
          [id]
        );

        if (crashedToken) {
          await sendCrashNotification(crashedToken);
        }
      }
    }
  } catch (error) {
    logger.error(`❌ Failed to update memecoin prices: ${logError(error)}`);
  }
}
