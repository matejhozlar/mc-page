import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import SftpClient from "ssh2-sftp-client";
import dotenv from "dotenv";
import logger from "../logger.js";

dotenv.config();

const sftp = new SftpClient();
const remoteDir = "/world/stats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localDir = path.join(__dirname, "../stats");

function flattenStats(statsObj) {
  const flat = [];
  for (const [type, entries] of Object.entries(statsObj)) {
    for (const [key, value] of Object.entries(entries)) {
      if (type === "minecraft:custom" && key === "minecraft:play_time") {
        continue;
      }

      flat.push({ stat_type: type, stat_key: key, value });
    }
  }
  return flat;
}

async function importStatsFromFile(uuid, filePath, db) {
  try {
    const userExists = await db.query(
      `SELECT 1 FROM users WHERE uuid = $1 LIMIT 1`,
      [uuid]
    );
    if (userExists.rowCount === 0) {
      logger.warn(`⏭️ Skipped UUID ${uuid} — not found in users table.`);
      return;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);
    const stats = flattenStats(json.stats);

    for (const { stat_type, stat_key, value } of stats) {
      const { rows } = await db.query(
        `SELECT value FROM player_stats WHERE uuid = $1 AND stat_type = $2 AND stat_key = $3`,
        [uuid, stat_type, stat_key]
      );

      const previousValue = rows[0]?.value ?? 0;
      const delta = value - previousValue;

      if (delta !== 0) {
        await db.query(
          `INSERT INTO player_stats (uuid, stat_type, stat_key, value)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (uuid, stat_type, stat_key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [uuid, stat_type, stat_key, value]
        );

        await db.query(
          `INSERT INTO daily_player_stats (uuid, stat_type, stat_key, stat_date, value)
       VALUES ($1, $2, $3, CURRENT_DATE, $4)
       ON CONFLICT (uuid, stat_type, stat_key, stat_date)
       DO UPDATE SET value = daily_player_stats.value + EXCLUDED.value`,
          [uuid, stat_type, stat_key, delta]
        );
      }
    }

    logger.info(`✅ Imported stats for UUID: ${uuid}`);
  } catch (error) {
    logger.error(`❌ Failed to import for ${uuid}: ${error}`);
  }
}

export async function syncAndImportStats(db, logger) {
  const start = Date.now();
  try {
    logger.info("🔄 Connecting to SFTP for stats sync...");
    await sftp.connect({
      host: process.env.SFTP_HOST,
      port: +process.env.SFTP_PORT,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASS,
    });
    logger.info(`📡 Connected to SFTP in ${Date.now() - start}ms`);

    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

    const files = await sftp.list(remoteDir);
    let downloaded = 0;

    for (const file of files) {
      const localPath = path.join(localDir, file.name);
      const remotePath = `${remoteDir}/${file.name}`;

      if (fs.existsSync(localPath)) {
        const localSize = fs.statSync(localPath).size;
        if (localSize === file.size) continue;
      }

      await sftp.fastGet(remotePath, localPath);
      downloaded++;
    }

    logger.info(`✅ Downloaded ${downloaded} updated stat file(s).`);

    const statFiles = fs
      .readdirSync(localDir)
      .filter((f) => f.endsWith(".json"));
    for (const file of statFiles) {
      const uuid = path.basename(file, ".json");
      const fullPath = path.join(localDir, file);
      await importStatsFromFile(uuid, fullPath, db);
    }

    logger.info("📊 Stat import complete.");
  } catch (error) {
    logger.error(`❌ syncAndImportStats failed: ${error}`);
  } finally {
    try {
      sftp.end();
      logger.info("🔌 SFTP connection closed cleanly.");
    } catch (error) {
      logger.warn(`⚠️ SFTP connection closed with warning: ${error}`);
    }
  }
}
