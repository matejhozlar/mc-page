import dotenv from "dotenv";
import { parse } from "path";
import pg from "pg";

dotenv.config();

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

function parseArgs() {
  const ids = process.argv.slice(2).filter(Boolean);
  if (ids.length === 0) {
    console.error("Please provide at least one discord_id.\nExample:");
    console.error(
      "node deleteMissingDiscordUsers.js 123456789012345678 987654321098765432"
    );
    process.exit(1);
  }
  return ids;
}

async function deleteForDiscordId(discordId) {
  await db.query("BEGIN");

  try {
    let clickerDeleted = 0;
    try {
      const res = await db.query(
        `DELETE FROM clicker_game_data WHERE discord_id = $1`,
        [discordId]
      );
      clickerDeleted = res.rowCount;
    } catch (error) {
      console.warn(
        `[WARN] [${discordId}] Could not delete from clicker_game_data: ${error.message}`
      );
    }

    if (clickerDeleted > 0) {
      console.log(
        `[${discordId}] clicker_game_data: deleted ${clickerDeleted} row(s)`
      );
    } else {
      console.log(`[${discordId}] clicker_game_data: nothing to delete (ok)`);
    }

    const userFundRes = await db.query(
      `DELETE FROM user_funds WHERE discord_id = $1`,
      [discordId]
    );
    console.log(
      `[${discordId}] user_funds: deleted ${userFundRes.rowCount} row(s)`
    );

    const userRes = await db.query(`DELETE FROM users WHERE discord_id = $1`, [
      discordId,
    ]);
    console.log(`[${discordId}] users: deleted ${userRes.rowCount} row(s)`);

    await db.query("COMMIT");

    const ok = userRes.rowCount > 0 ? "[OK]" : "[ERROR]";
    console.log(`${ok} [${discordId}] Done.\n`);
  } catch (error) {
    await db.query("ROLLBACK");
    console.error(
      `[ERROR] [${discordId}] rolled back changes:`,
      error.message,
      "\n"
    );
  }
}

async function main() {
  const ids = parseArgs();
  await db.connect();
  console.log("Connected to DB");

  for (const id of ids) {
    await deleteForDiscordId(id);
  }

  await db.end();
  console.log("Disconnected from DB");
}

main().catch((error) => {
  console.error("Fatal error", error);
  process.exit(1);
});
