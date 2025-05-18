import fs from "fs/promises";
import path from "path";
import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
} from "discord.js";
import { fileURLToPath } from "url";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";

const cooldown = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const data = new SlashCommandBuilder()
  .setName("stats-info")
  .setDescription(
    "Export all known Minecraft stat categories and keys (once per 24h)"
  );

export async function execute(interaction, db) {
  const userId = interaction.user.id;
  const now = Date.now();
  const cooldownMs = 24 * 60 * 60 * 1000;

  if (cooldown.has(userId)) {
    const lastUsed = cooldown.get(userId);
    const diff = now - lastUsed;
    if (diff < cooldownMs) {
      const hoursLeft = ((cooldownMs - diff) / (1000 * 60 * 60)).toFixed(1);
      return await interaction.reply({
        content: `⏳ You can use this command again in ${hoursLeft} hour(s).`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await db.query(`
      SELECT DISTINCT stat_type, stat_key
      FROM player_stats
      ORDER BY stat_type, stat_key
    `);

    const grouped = {};
    for (const row of res.rows) {
      if (!grouped[row.stat_type]) grouped[row.stat_type] = [];
      grouped[row.stat_type].push(row.stat_key);
    }

    const tmpDir = path.join(__dirname, "../../tmp");
    await fs.mkdir(tmpDir, { recursive: true });

    const jsonPath = path.join(tmpDir, `stats-info-${userId}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(grouped, null, 2));

    const file = new AttachmentBuilder(jsonPath);
    await interaction.editReply({
      content: `📊 Here's your exported stats info.`,
      files: [file],
    });
    await fs
      .unlink(jsonPath)
      .catch(() => logger.warn(`⚠️ Failed to delete temp file: ${jsonPath}`));
    cooldown.set(userId, now);
  } catch (err) {
    logger.error(`❌ /stats-info failed: ${logError(err)}`);
    await interaction.editReply("⚠️ Failed to fetch or send stats info.");
  }
}
