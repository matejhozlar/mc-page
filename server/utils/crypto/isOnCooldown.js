export async function getCooldownStatus(db, userId) {
  const { rows } = await db.query(
    `SELECT timestamp FROM token_transactions
     WHERE discord_id = $1
     ORDER BY timestamp DESC
     LIMIT 1`,
    [userId]
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
