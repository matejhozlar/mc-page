/**
 * Checks if a user is currently on cooldown for a specific token transaction.
 *
 * @param {import('pg').Pool} db - The PostgreSQL database connection pool.
 * @param {string} userId - The Discord user ID to check cooldown for.
 * @param {string} tokenId - The token ID associated with the transaction.
 * @returns {Promise<{ onCooldown: boolean, secondsRemaining: number }>}
 * An object indicating whether the user is on cooldown and how many seconds remain.
 */
export async function getCooldownStatus(db, userId, tokenId) {
  const { rows } = await db.query(
    `SELECT timestamp FROM token_transactions
     WHERE discord_id = $1 AND token_id = $2
     ORDER BY timestamp DESC
     LIMIT 1`,
    [userId, tokenId]
  );

  if (!rows.length) return { onCooldown: false, secondsRemaining: 0 };

  const lastTxTime = new Date(rows[0].timestamp);
  const now = new Date();
  const secondsSinceLastTx = (now - lastTxTime) / 1000;

  const secondsRemaining = Math.ceil(180 - secondsSinceLastTx);
  return {
    onCooldown: secondsRemaining > 0,
    secondsRemaining: secondsRemaining > 0 ? secondsRemaining : 0,
  };
}
