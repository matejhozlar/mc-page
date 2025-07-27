import logger from "../../../logger.js";

export async function updateRingcoinPriceDaily(db, tokenSymbol = "RGC") {
  try {
    const { rows } = await db.query(
      `SELECT id, price_per_unit FROM crypto_tokens WHERE symbol = $1 LIMIT 1`,
      [tokenSymbol]
    );

    if (!rows.length) throw new Error(`Token ${tokenSymbol} not found`);

    const { id: tokenId, price_per_unit } = rows[0];
    const price = Number(price_per_unit);

    await db.query(
      `INSERT INTO token_price_history_daily (token_id, price, recorded_at)
       VALUES ($1, $2, NOW())`,
      [tokenId, price]
    );

    logger.info(`✅ Daily snapshot saved for ${tokenSymbol}: $${price}`);
  } catch (error) {
    logger.error(
      `❌ Failed to update price for ${tokenSymbol} (daily): ${error}`
    );
  }
}
