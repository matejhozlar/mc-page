import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

function stripDashes(uuid) {
  return uuid.replace(/-/g, "").toLowerCase();
}

// Simple concurrency limiter (avoid hammering Mojang)
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;

  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function fetchMcNameByUuid(uuidWithDashes) {
  const uuidNoDashes = stripDashes(uuidWithDashes);
  const url = `https://sessionserver.mojang.com/session/minecraft/profile/${uuidNoDashes}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "User-Agent": "mc-name-repair/1.0" },
  });

  if (res.status === 204) return null; // no content
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mojang API ${res.status} for ${uuidWithDashes}: ${text}`);
  }

  const data = await res.json();
  return data?.name ?? null;
}

async function main() {
  // Change this to true if you want to update EVERYONE (not just blahblah)
  const FIX_ALL = false;

  const BAD_NAME = "MeleeG0D246"; // the value you accidentally set
  const CONCURRENCY = 5; // keep low to avoid rate limits
  const DRY_RUN = false; // set true to only print what would change

  await db.connect();
  console.log("Connected to DB");

  const selectSql = FIX_ALL
    ? `SELECT uuid, name FROM public.users`
    : `SELECT uuid, name FROM public.users WHERE name = $1`;

  const selectParams = FIX_ALL ? [] : [BAD_NAME];
  const { rows } = await db.query(selectSql, selectParams);

  if (rows.length === 0) {
    console.log("No rows to fix.");
    await db.end();
    return;
  }

  console.log(`Found ${rows.length} user(s) to fix.`);

  // Fetch names
  const fetched = await mapWithConcurrency(rows, CONCURRENCY, async (row) => {
    try {
      const mcName = await fetchMcNameByUuid(row.uuid);
      return { uuid: row.uuid, oldName: row.name, newName: mcName, ok: true };
    } catch (e) {
      return {
        uuid: row.uuid,
        oldName: row.name,
        newName: null,
        ok: false,
        error: e?.message ?? String(e),
      };
    }
  });

  const failures = fetched.filter((r) => !r.ok || !r.newName);
  const successes = fetched.filter((r) => r.ok && r.newName);

  console.log(
    `Fetched names: ${successes.length} ok, ${failures.length} failed/empty`
  );

  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures.slice(0, 30)) {
      console.log(`- ${f.uuid}: ${f.error ?? "no name returned"}`);
    }
    if (failures.length > 30)
      console.log(`...and ${failures.length - 30} more`);
    console.log("");
  }

  // Nothing to update?
  const toUpdate = successes.filter((r) => r.newName !== r.oldName);
  console.log(`${toUpdate.length} row(s) will actually change.`);

  if (DRY_RUN) {
    console.log("\nDRY RUN preview (first 30):");
    for (const r of toUpdate.slice(0, 30)) {
      console.log(`- ${r.uuid}: '${r.oldName}' -> '${r.newName}'`);
    }
    await db.end();
    return;
  }

  // Update inside a transaction
  await db.query("BEGIN");

  try {
    // Use a prepared statement for speed/safety
    const updateSql = `UPDATE public.users SET name = $1 WHERE uuid = $2`;

    for (const r of toUpdate) {
      await db.query(updateSql, [r.newName, r.uuid]);
    }

    await db.query("COMMIT");
    console.log(
      "Committed updates to users.name (user_funds should sync via trigger)."
    );
  } catch (e) {
    await db.query("ROLLBACK");
    console.error("Rolled back due to error:", e);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
