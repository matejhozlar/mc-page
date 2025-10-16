import logger from "../../../logger.js";
import config from "../../../config/index.js";

/**
 * Updates stablecoin price and stores historical data.
 *
 * @param {Object} db - Database instance.
 * @param {"minutes"|"hourly"|"daily"|"weekly"} interval - Snapshot interval type.
 * @param {string} tokenSymbol - Token symbol (e.g., "RGC")
 */

const {
  DEFAULT_LAST_PRICE,
  PLAYER_ACTIVITY_INTERVAL,
  INFLATION_RATE_PER_PLAYER,
  DECAY_RATE,
  FLOOR_PRICE,
} = config.stablecoins;

export async function updateStableCoinPrice(
  db,
  interval,
  tokenSymbol,
  io = null
) {
  try {
    const { rows } = await db.query(
      `SELECT id, price_per_unit FROM crypto_tokens WHERE symbol = $1 LIMIT 1`,
      [tokenSymbol]
    );
    if (!rows.length) throw new Error(`Token ${tokenSymbol} not found`);

    const tokenId = rows[0].id;
    let price = Number(rows[0].price_per_unit);

    if (interval === "minutes") {
      const { rows: snapshotRows } = await db.query(
        `SELECT total_seconds, snapshot_time
         FROM server_playtime_snapshots
         ORDER BY snapshot_time DESC
         LIMIT 2`
      );

      if (snapshotRows.length < 2) return;

      const [latest, previous] = snapshotRows;
      const delta = latest.total_seconds - previous.total_seconds;

      const lastPriceRes = await db.query(
        `SELECT price FROM token_price_history_minutes
         WHERE token_id = $1
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [tokenId]
      );

      const lastPrice = Number(
        lastPriceRes.rows[0]?.price || DEFAULT_LAST_PRICE
      );
      let newPrice;

      if (delta > 0) {
        const activePlayers = delta / PLAYER_ACTIVITY_INTERVAL;
        const change = activePlayers * INFLATION_RATE_PER_PLAYER;
        newPrice = lastPrice + change;
      } else {
        newPrice = lastPrice - DECAY_RATE;
      }

      newPrice = Math.max(FLOOR_PRICE, newPrice);

      await db.query(
        `INSERT INTO token_price_history_minutes (token_id, price) VALUES ($1, $2)`,
        [tokenId, newPrice]
      );

      await db.query(
        `UPDATE crypto_tokens SET price_per_unit = $1 WHERE id = $2`,
        [newPrice, tokenId]
      );

      if (io && interval === "minutes") {
        const {
          rows: [updatedToken],
        } = await db.query(
          `SELECT id, name, symbol, price_per_unit, available_supply, crashed
            FROM crypto_tokens
            WHERE id = $1`,
          [tokenId]
        );

        io.emit("token:update", updatedToken);
      }

      const changeStr =
        delta > 0
          ? `+$${(newPrice - lastPrice).toFixed(3)} from ${delta.toFixed(1)}s`
          : `-$${(lastPrice - newPrice).toFixed(3)} due to inactivity`;

      logger.info(
        `Price updated: $${lastPrice.toFixed(3)} → $${newPrice.toFixed(
          3
        )} (${changeStr})`
      );
      return;
    }

    const historyTable = `token_price_history_${interval}`;
    await db.query(
      `INSERT INTO ${historyTable} (token_id, price, recorded_at)
       VALUES ($1, $2, NOW())`,
      [tokenId, price]
    );

    logger.info(`${interval} snapshot saved for ${tokenSymbol} ($${price})`);
  } catch (error) {
    logger.error(`Failed to update stablecoin price (${interval}):`, error);
  }
}
