export async function logTransactions(db, data) {
  const {
    uuid,
    action,
    amount,
    from_uuid = null,
    to_uuid = null,
    denomination = null,
    count = null,
    balance_after = null,
  } = data;

  await db.query(
    `INSERT INTO currency_transactions
        (uuid, action, amount, from_uuid, to_uuid, denomination, count, balance_after)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      uuid,
      action,
      amount,
      from_uuid,
      to_uuid,
      denomination,
      count,
      balance_after,
    ]
  );
}
