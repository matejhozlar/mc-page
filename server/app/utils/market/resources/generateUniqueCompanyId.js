import { randomInt } from "crypto";

export async function generateUniqueCompanyId(db) {
  let attempt = 0;
  const maxAttempts = 10;

  while (attempt < maxAttempts) {
    const id = randomInt(1000, 10000);

    const { rowCount: inCompanies } = await db.query(
      `SELECT 1 FROM companies WHERE id = $1`,
      [id]
    );

    const { rowCount: inPending } = await db.query(
      `SELECT 1 FROM pending_companies WHERE id = $1`,
      [id]
    );

    if (inCompanies === 0 && inPending === 0) return id;

    attempt++;
  }

  throw new Error(
    "⚠️ Failed to generate unique company ID after several attempts."
  );
}
