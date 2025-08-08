import { randomInt } from "crypto";

export async function generateUniqueShopId(db) {
  let attempt = 0;
  const maxAttempts = 10;

  while (attempt < maxAttempts) {
    const id = randomInt(10000, 99999);

    const { rowCount: inCompanies } = await db.query(
      `SELECT 1 FROM shops WHERE id = $1`,
      [id]
    );

    const { rowCount: inPending } = await db.query(
      `SELECT 1 FROM pending_shops WHERE id = $1`,
      [id]
    );

    if (inCompanies === 0 && inPending === 0) return id;

    attempt++;
  }

  throw new Error(
    "⚠️ Failed to generate unique company ID after several attempts."
  );
}
