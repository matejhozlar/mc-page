import logger from "../../logger.js";
import logError from "../../utils/logError.js";

export async function updateRingcoinPriceHourly(db, tokenId = 1) {
  try {
    const lastPriceRes = await db.query(
      `SELECT price_per_unit FROM crypto_tokens WHERE id = $1`,
      [tokenId]
    );

    if (!lastPriceRes.rows.length) {
      throw new Error(`No price found for token ID ${tokenId}`);
    }

    const price = Number(lastPriceRes.rows[0].price_per_unit);

    await db.query(
      `INSERT INTO token_price_history_hourly (token_id, price, recorded_at)
       VALUES ($1, $2, NOW())`,
      [tokenId, price]
    );

    logger.info(`✅ Hourly snapshot saved for token ${tokenId}: $${price}`);
  } catch (error) {
    logger.error(
      `❌ Failed to update Ringcoin price (Hourly): ${logError(error)}`
    );
  }
}
