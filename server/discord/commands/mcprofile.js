import {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import SftpClient from "ssh2-sftp-client";
import logger from "../../logger.js";
import config from "../../config/index.js";

const { GREEN } = config.uiColors;

const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
const ADMIN_CHAT_CHANNEL_ID = process.env.DISCORD_ADMIN_CHAT_CHANNEL_ID;
const SFTP_HOST = process.env.SFTP_HOST;
const SFTP_PORT = process.env.SFTP_PORT;
const SFTP_USER = process.env.SFTP_USER;
const SFTP_PASS = process.env.SFTP_PASS;
const REMOTE_DIR = "/world/stats";

function isUuidLike(s) {
  if (!s) return false;
  const cleaned = s.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(cleaned);
}

function normalizeUuid(s) {
  const hex = s.replace(/-/g, "").toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function extractDiscordId(s) {
  if (!s) return null;
  const m = s.match(/\d{15,25}/);
  return m ? m[0] : null;
}

function isAdminInteraction(interaction) {
  const hasRole =
    ADMIN_ROLE_ID && interaction.member?.roles?.cache?.has(ADMIN_ROLE_ID);
  const hasAdminPerm = interaction.memberPermissions?.has(
    PermissionFlagsBits.Administrator
  );
  return Boolean(hasRole || hasAdminPerm);
}

function isAdminChannel(interaction) {
  if (!ADMIN_CHAT_CHANNEL_ID) return false;
  const ch = interaction.channel;
  if (!ch) return false;
  if (ch.id === ADMIN_CHAT_CHANNEL_ID) return true;
  if (ch.isThread && ch.isThread()) {
    return ch.parentId === ADMIN_CHAT_CHANNEL_ID;
  }
  return false;
}

function classifyQuery(input) {
  const raw = input.trim();
  if (isUuidLike(raw)) {
    return { kind: "uuid", value: normalizeUuid(raw) };
  }
  const discordId = extractDiscordId(raw);
  if (discordId) {
    return { kind: "discord", value: discordId };
  }
  return { kind: "name", value: raw };
}

async function resolveUserRecord(db, selector) {
  if (selector.kind === "uuid") {
    const q = `SELECT uuid, discord_id, name FROM users WHERE uuid = $1 LIMIT 1;`;
    const { rows } = await db.query(q, [selector.value]);
    if (rows.length === 0) throw new Error("UUID not found in users table.");
    return rows[0];
  }
  if (selector.kind === "discord") {
    const q = `SELECT uuid, discord_id, name FROM users WHERE discord_id = $1 LIMIT 1;`;
    const { rows } = await db.query(q, [selector.value]);
    if (rows.length === 0)
      throw new Error("Discord ID not found in users table.");
    return rows[0];
  }
  const q = `SELECT uuid, discord_id, name FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1;`;
  const { rows } = await db.query(q, [selector.value]);
  if (rows.length === 0)
    throw new Error("Minecraft name not found in users table.");
  return rows[0];
}

async function fetchStatsFile(uuid) {
  const sftp = new SftpClient();
  const remotePath = `${REMOTE_DIR}/${uuid}.json`;
  try {
    await sftp.connect({
      host: SFTP_HOST,
      port: SFTP_PORT,
      username: SFTP_USER,
      password: SFTP_PASS,
      readyTimeout: 15000,
    });
    const buffer = await sftp.get(remotePath);
    return { buffer, remotePath };
  } finally {
    try {
      await sftp.end();
    } catch {}
  }
}

export const data = new SlashCommandBuilder()
  .setName("mcprofile")
  .setDescription("Admin: fetch a player's Minecraft stats file and profile")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("Discord ID/mention, Minecraft UUID, or Minecraft name")
      .setRequired(true)
  );

export const prodOnly = true;

export async function execute(interaction, db) {
  if (!isAdminInteraction(interaction)) {
    return interaction.reply({
      content: "❌ You don't have permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!isAdminChannel(interaction)) {
    const where = ADMIN_CHAT_CHANNEL_ID
      ? `in <#${ADMIN_CHAT_CHANNEL_ID}>`
      : "in the configured admin channel";
    return interaction.reply({
      content: `❌ This command can only be used ${where}.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const input = interaction.options.getString("query");
  const selector = classifyQuery(input);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await interaction.editReply(
      `🔎 Resolving **${selector.kind}** \`${selector.value}\` in database…`
    );

    const user = await resolveUserRecord(db, selector);
    const uuid = normalizeUuid(user.uuid);

    await interaction.editReply("🔐 Connecting to SERVER…");
    let statsBuffer, remotePath;
    try {
      const res = await fetchStatsFile(uuid);
      statsBuffer = res.buffer;
      remotePath = res.remotePath;
    } catch (error) {
      logger.error("SFTP fetch failed:", error);
      return await interaction.editReply(
        "⚠️ Couldn't fetch the stats file from the server. Please try again later."
      );
    }

    await interaction.editReply("📦 Packaging profile and stats…");

    const embed = new EmbedBuilder()
      .setTitle("📘 Minecraft Player Profile")
      .setDescription("Stats file and linked identifiers")
      .addFields(
        { name: "Minecraft Name", value: user.name || "—", inline: true },
        { name: "UUID", value: uuid, inline: true },
        {
          name: "Discord",
          value: user.discord_id ? `<@${user.discord_id}>` : "—",
          inline: true,
        },
        { name: "Source", value: `\`${remotePath}\`` },
        {
          name: "Requested by",
          value: `<@${interaction.user.id}>`,
          inline: false,
        }
      )
      .setColor(GREEN)
      .setTimestamp(new Date());

    const attachment = new AttachmentBuilder(statsBuffer, {
      name: `${uuid}.json`,
    });

    await interaction.followUp({
      content: "✅ Player profile and stats:",
      embeds: [embed],
      files: [attachment],
      allowedMentions: { parse: [] },
    });

    await interaction.editReply("✅ Posted results.");
  } catch (error) {
    logger.error("/mcprofile failed:", error);
    await interaction.editReply(`❌ ${error?.message ?? "Unknown error"}`);
  }
}
