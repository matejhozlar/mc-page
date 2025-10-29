import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import SftpClient from "ssh2-sftp-client";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import logger from "../../logger.js";
import config from "../../config/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { GREEN } = config.uiColors;

const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
const ADMIN_CHAT_CHANNEL_ID = process.env.DISCORD_ADMIN_CHAT_CHANNEL_ID;
const SFTP_HOST = process.env.SFTP_HOST;
const SFTP_PORT = process.env.SFTP_PORT;
const SFTP_USER = process.env.SFTP_USER;
const SFTP_PASS = process.env.SFTP_PASS;

const OPENPAC_BASE_DIR =
  "/world/data/openpartiesandclaims/player-configs/sub-configs";

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "utils",
  "config",
  "openpac",
  "shop_template.toml"
);

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
function classifyQuery(input) {
  const raw = input.trim();
  if (isUuidLike(raw)) return { kind: "uuid", value: normalizeUuid(raw) };
  const discordId = extractDiscordId(raw);
  if (discordId) return { kind: "discord", value: discordId };
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

const FILE_RX = /^(.+)\$(\d+)\.toml$/i;

function nextLetterSuffix(usedBases) {
  for (let i = 0; i < 26; i++) {
    const candidate = "Shop" + String.fromCharCode(97 + i);
    if (!usedBases.has(candidate)) return candidate;
  }
  return null;
}

async function ensureDir(sftp, dir) {
  try {
    await sftp.mkdir(dir, true);
  } catch (e) {
    if (!/failure|exists/i.test(String(e?.message))) throw e;
  }
}

async function readShopTemplateStrict() {
  const buf = await fs.readFile(TEMPLATE_PATH);
  const text = buf.toString("utf8");
  if (!/name\s*=\s*"Shop"/.test(text)) {
    return text.replace(
      /(\bname\s*=\s*")([^"]*)(")/,
      (_m, p1, _old, p3) => `${p1}Shop${p3}`
    );
  }
  return text;
}

function replaceTomlName(content, newName) {
  return content.replace(
    /(\bname\s*=\s*")([^"]*)(")/,
    (_m, p1, _old, p3) => `${p1}${newName}${p3}`
  );
}

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Admin: remote config operations")
  .addStringOption((option) =>
    option
      .setName("option")
      .setDescription("Which config tool to run")
      .addChoices({ name: "openpac", value: "openpac" })
      .setRequired(true)
  )
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

  const option = interaction.options.getString("option");
  const input = interaction.options.getString("query");

  if (option !== "openpac") {
    return interaction.reply({
      content: "⚠️ Unsupported option for now. Available: `openpac`.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const selector = classifyQuery(input);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await interaction.editReply(
      `🔎 Resolving **${selector.kind}** \`${selector.value}\` in database…`
    );
    const user = await resolveUserRecord(db, selector);
    const uuid = normalizeUuid(user.uuid);

    const remoteDir = `${OPENPAC_BASE_DIR}/${uuid}`;
    const sftp = new SftpClient();

    await interaction.editReply("🔐 Connecting to SERVER…");
    await sftp.connect({
      host: SFTP_HOST,
      port: SFTP_PORT,
      username: SFTP_USER,
      password: SFTP_PASS,
      readyTimeout: 20000,
    });

    try {
      await interaction.editReply("📁 Ensuring player sub-config directory…");
      await ensureDir(sftp, remoteDir);

      await interaction.editReply("🗂️ Scanning existing sub-configs…");
      const listing = await sftp.list(remoteDir).catch(() => []);
      const tomls = listing.filter(
        (f) => f.type === "-" && f.name.endsWith(".toml")
      );

      const entries = tomls
        .map((f) => {
          const m = f.name.match(FILE_RX);
          if (!m) return null;
          return {
            base: m[1],
            serial: parseInt(m[2], 10),
            name: f.name,
          };
        })
        .filter(Boolean);

      const usedBases = new Set(entries.map((e) => e.base));
      const maxSerial = entries.reduce((mx, e) => Math.max(mx, e.serial), 0);
      const nextSerial = maxSerial + 1;

      let renamed = null;
      const shopCandidates = entries.filter((e) => e.base === "Shop");
      if (shopCandidates.length > 0) {
        const existingShop = shopCandidates.reduce((a, b) =>
          a.serial >= b.serial ? a : b
        );
        const newBase = nextLetterSuffix(usedBases);
        if (!newBase) {
          throw new Error(
            "There are already Shop..Shopz configs. Cannot auto-rename."
          );
        }

        await interaction.editReply(`✍️ Renaming existing Shop to ${newBase}…`);

        const oldPath = `${remoteDir}/${existingShop.name}`;
        const newName = `${newBase}$${existingShop.serial}.toml`;
        const newPath = `${remoteDir}/${newName}`;

        const fileBuf = await sftp.get(oldPath);
        const oldText = fileBuf.toString("utf8");
        const newText = replaceTomlName(oldText, newBase);

        await sftp.put(Buffer.from(newText, "utf8"), newPath);
        await sftp.delete(oldPath);

        usedBases.delete("Shop");
        usedBases.add(newBase);

        renamed = { from: existingShop.name, to: newName };
      }

      await interaction.editReply("🧩 Reading template and creating new file…");

      const template = await readShopTemplateStrict();

      const newFileName = `Shop$${nextSerial}.toml`;
      const newRemotePath = `${remoteDir}/${newFileName}`;
      await sftp.put(Buffer.from(template, "utf8"), newRemotePath);

      await interaction.editReply("✅ Finished. Posting summary…");

      const embed = new EmbedBuilder()
        .setTitle("🛠️ OpenPAC Sub-Config Updated")
        .setColor(GREEN)
        .addFields(
          { name: "Player", value: `${user.name ?? "—"} (${uuid})` },
          { name: "Folder", value: `${remoteDir}` },
          {
            name: "Created",
            value: `${newFileName}`,
            inline: false,
          },
          ...(renamed
            ? [
                {
                  name: "Renamed Existing",
                  value: `${renamed.from} → ${renamed.to}`,
                },
              ]
            : [])
        )
        .setTimestamp(new Date());

      await interaction.followUp({
        embeds: [embed],
      });
      await interaction.editReply("✅ Done.");
    } finally {
      try {
        await sftp.end();
      } catch {}
    }
  } catch (error) {
    logger.error("/config openpac failed:", error);
    await interaction.editReply(
      `❌ ${error?.message || "Unexpected error while processing the request."}`
    );
  }
}
