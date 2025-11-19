import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import prompts from "prompts";
import chalk from "chalk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  DB_USER,
  DB_HOST,
  DB_DATABASE,
  DB_PASSWORD,
  DB_PORT,
  USERS_TABLE = "users",
  USERS_UUID_COLUMN = "uuid",
} = process.env;

async function main() {
  const dataDir = path.resolve(__dirname, "data");
  const dataPath = path.join(dataDir, "data.json");
  const raw = await fs.readFile(dataPath, "utf8");
  let input;
  try {
    input = JSON.parse(raw);
    if (!Array.isArray(input)) throw new Error("data.json must be an array");
  } catch (e) {
    console.error("Failed to parse ./data/data.json:", e.message);
    process.exit(1);
  }

  const fileUsers = input
    .filter((u) => u && typeof u.uuid === "string")
    .map((u) => ({ uuid: u.uuid, name: u.name ?? null }));

  if (fileUsers.length === 0) {
    console.log("No valid entries found in data.json.");
    return;
  }

  const db = new pg.Client({
    user: DB_USER,
    host: DB_HOST,
    database: DB_DATABASE,
    password: DB_PASSWORD,
    port: DB_PORT ? Number(DB_PORT) : undefined,
  });

  await db.connect();
  console.log("Connected to DB");

  let rows;
  try {
    const q = `SELECT ${USERS_UUID_COLUMN}::text AS uuid FROM ${USERS_TABLE}`;
    const result = await db.query(q);
    rows = result.rows;
  } catch (e) {
    console.error(
      `Query failed. Check USERS_TABLE and USERS_UUID_COLUMN env vars.\nReason: ${e.message}`
    );
    await db.end();
    process.exit(1);
  }

  await db.end();

  const dbUuidSet = new Set(rows.map((r) => r.uuid));
  const missing = fileUsers.filter((u) => !dbUuidSet.has(u.uuid));

  if (missing.length === 0) {
    console.log("Everyone in data.json exists in the users table.");
    return;
  }

  console.log("In file but NOT in DB (by uuid):");
  for (const u of missing) {
    console.log(`- ${u.name ?? "(no name)"} | uuid: ${u.uuid}`);
  }

  const outPath = path.join(dataDir, "missing.json");
  await fs.mkdir(dataDir, { recursive: true });

  let state = [];
  try {
    const prevRaw = await fs.readFile(outPath, "utf8");
    state = JSON.parse(prevRaw);
  } catch (_) {}

  const removedMap = new Map(state.map((u) => [u.uuid, !!u.removed]));
  const current = missing.map((u) => ({
    ...u,
    removed: removedMap.get(u.uuid) || false,
  }));

  const save = async (list) =>
    fs.writeFile(outPath, JSON.stringify(list, null, 2), "utf8");

  console.log("\nCurrent status:");
  for (const u of current) {
    const label = `${u.name ?? "(no name)"} | uuid: ${u.uuid}`;
    console.log(u.removed ? `- ${chalk.strikethrough(label)}` : `- ${label}`);
  }
  await save(current);
  console.log(`\nState saved to ${outPath}`);

  const onAbort = () => {
    console.log(chalk.yellow("\nAborted."));
    process.exit(0);
  };
  prompts.override({ onCancel: onAbort, onAbort });

  while (true) {
    const choices = current
      .filter((u) => !u.removed)
      .map((u) => ({
        title: `${u.name ?? "(no name)"} — ${u.uuid}`,
        value: u.uuid,
      }));

    if (choices.length === 0) {
      console.log(
        chalk.green("\nAll users have been marked removed. You're done!")
      );
      break;
    }

    const { picked } = await prompts({
      type: "multiselect",
      name: "picked",
      message:
        "Select users you have NOW removed (space to toggle, enter to confirm):",
      choices,
      hint: "- ↑/↓ to move, space to select, enter to submit",
    });

    if (!picked || picked.length === 0) {
      const { cont } = await prompts({
        type: "confirm",
        name: "cont",
        message: "No changes made. Continue later?",
        initial: true,
      });
      if (cont) break;
      else continue;
    }

    const pickedSet = new Set(picked);
    for (const u of current) {
      if (pickedSet.has(u.uuid)) u.removed = true;
    }
    await save(current);

    const remaining = current.filter((u) => !u.removed).length;
    const done = current.length - remaining;
    console.log(
      chalk.cyan(`\nMarked ${done} removed; ${remaining} remaining.`)
    );

    for (const u of current) {
      const label = `${u.name ?? "(no name)"} | uuid: ${u.uuid}`;
      console.log(u.removed ? `- ${chalk.strikethrough(label)}` : `- ${label}`);
    }

    const { again } = await prompts({
      type: "confirm",
      name: "again",
      message: "Keep going?",
      initial: true,
    });
    if (!again) break;
  }

  const remainingList = current
    .filter((u) => !u.removed)
    .map(({ removed, ...rest }) => rest);
  const remainingPath = path.join(dataDir, "remaining-missing.json");
  await fs.writeFile(
    remainingPath,
    JSON.stringify(remainingList, null, 2),
    "utf8"
  );
  console.log(chalk.green(`\nExported still-missing to ${remainingPath}`));

  const whitelistPath = path.join(dataDir, "whitelist.json");
  const whitelist = fileUsers.filter((u) => dbUuidSet.has(u.uuid));
  await fs.writeFile(
    whitelistPath,
    JSON.stringify(whitelist, null, 2),
    "utf-8"
  );
  console.log(
    chalk.green(`\nExported whitelist (users in DB) to ${whitelistPath}`)
  );
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
