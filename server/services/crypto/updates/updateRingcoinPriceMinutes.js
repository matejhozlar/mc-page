import logger from "../../../logger.js";
export async function updateRingcoinPriceMinutes(db, tokenId = 1) {
  try {
    const { rows } = await db.query(
      `SELECT total_seconds, snapshot_time
       FROM server_playtime_snapshots
       ORDER BY snapshot_time DESC
       LIMIT 2`
    );

    if (rows.length < 2) return;

    const [latest, previous] = rows;
    const delta = latest.total_seconds - previous.total_seconds;

    const lastPriceRes = await db.query(
      `SELECT price FROM token_price_history_minutes
       WHERE token_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [tokenId]
    );

    const lastPrice = Number(lastPriceRes.rows[0]?.price || 1);
    let newPrice;

    if (delta > 0) {
      const activePlayers = delta / 300;
      const change = activePlayers * 0.00025;
      newPrice = lastPrice + change;
    } else {
      const decayRate = 0.00005;
      newPrice = lastPrice - decayRate;
    }

    newPrice = Math.max(0.1, newPrice);

    await db.query(
      `INSERT INTO token_price_history_minutes (token_id, price)
       VALUES ($1, $2)`,
      [tokenId, newPrice]
    );

    await db.query(
      `UPDATE crypto_tokens
       SET price_per_unit = $1
       WHERE id = $2`,
      [newPrice, tokenId]
    );

    const changeStr =
      delta > 0
        ? `📈 +$${(newPrice - lastPrice).toFixed(3)} from ${delta.toFixed(1)}s`
        : `📉 -$${(lastPrice - newPrice).toFixed(3)} due to inactivity`;

    logger.info(
      `💰 Ringcoin updated: $${lastPrice.toFixed(3)} → $${newPrice.toFixed(
        3
      )} (${changeStr})`
    );
  } catch (error) {
    logger.error(`❌ Failed to update Ringcoin price: ${error}`);
  }
}
