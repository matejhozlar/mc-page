import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  AttachmentBuilder,
  InteractionType,
  ComponentType,
  MessageFlags,
  Message,
} from "discord.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userCooldowns = new Map();
const COOLDOWN_MS = 60 * 60 * 1000;

export const data = new SlashCommandBuilder()
  .setName("stats-crowns")
  .setDescription(
    "View how many stats you're 1st place in — and export the details!"
  )
  .addStringOption((option) =>
    option
      .setName("mc_name")
      .setDescription("Minecraft username to check (optional)")
      .setRequired(false)
  );

export async function execute(interaction, db) {
  const inputName = interaction.options.getString("mc_name");
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    let mcName = inputName;

    if (!mcName) {
      const result = await db.query(
        `SELECT name FROM users WHERE discord_id = $1 LIMIT 1`,
        [interaction.user.id]
      );
      if (result.rowCount === 0) {
        return await interaction.editReply({
          content: "❌ No linked Minecraft account found.",
          flags: MessageFlags.Ephemeral,
        });
      }
      mcName = result.rows[0].name;
    }

    const query = `
      SELECT stat_type, stat_key, value
      FROM (
        SELECT DISTINCT ON (stat_type, stat_key)
              stat_type, stat_key, value, uuid
        FROM player_stats
        ORDER BY stat_type, stat_key, value DESC
      ) top_stats
      JOIN users u ON u.uuid = top_stats.uuid
      WHERE u.name = $1
    `;

    const { rows } = await db.query(query, [mcName]);

    if (rows.length === 0) {
      return await interaction.editReply({
        content: `❌ No #1 stat positions found for \`${mcName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const isSelf =
      !inputName ||
      mcName.toLowerCase() === interaction.user.username.toLowerCase();
    const totalCrowns = rows.length;
    const embed = new EmbedBuilder()
      .setTitle(`👑 ${mcName}'s Crowns`)
      .setDescription(
        isSelf
          ? `You are **#1** in **${totalCrowns}** stat${
              totalCrowns === 1 ? "" : "s"
            }!`
          : `**${mcName}** is #1 in **${totalCrowns}** stat${
              totalCrowns === 1 ? "" : "s"
            }!`
      )
      .setColor(0xe67e22)
      .setFooter({
        text: "Stat Crown Report",
        iconURL: interaction.client.user.displayAvatarURL(),
      });

    const button = new ButtonBuilder()
      .setLabel("📂 View Crown Stats")
      .setStyle(ButtonStyle.Primary)
      .setCustomId("send_crowns_json");

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      filter: (i) =>
        i.customId === "send_crowns_json" && i.user.id === interaction.user.id,
      max: 1,
    });

    collector.on("collect", async (btnInt) => {
      const userId = btnInt.user.id;
      const now = Date.now();
      const lastUsed = userCooldowns.get(userId) || 0;

      if (now - lastUsed < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - (now - lastUsed);
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);

        return await btnInt.reply({
          content: `⏳ You can export this file again in **${minutes}** minute(s) and **${seconds}** second(s).`,
          flags: MessageFlags.Ephemeral,
        });
      }

      userCooldowns.set(userId, now);

      try {
        const tmpDir = path.join(__dirname, "../../tmp");
        await fs.mkdir(tmpDir, { recursive: true });
        const filePath = path.join(tmpDir, `crowns-${mcName}.json`);
        await fs.writeFile(filePath, JSON.stringify(rows, null, 2));

        const file = new AttachmentBuilder(filePath, {
          name: `crowns-${mcName}.json`,
        });

        await btnInt.reply({
          content: `📦 Here's your crown stat export for **${mcName}**.`,
          files: [file],
          flags: MessageFlags.Ephemeral,
        });

        await fs.unlink(filePath);
      } catch (err) {
        logger.warn(`⚠️ Could not create/send/delete crown file: ${err}`);
        await btnInt.reply({
          content: `❌ Something went wrong exporting your file.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    });

    collector.on("end", async () => {
      try {
        await fs.unlink(filePath);
      } catch {}
    });
  } catch (error) {
    logger.error(`❌ /stats-crowns failed: ${error}`);
    await interaction.editReply("⚠️ Something went wrong. Try again later.");
  }
}
