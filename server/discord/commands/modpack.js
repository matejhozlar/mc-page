import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
  Message,
} from "discord.js";
import logger from "../../logger.js";
import config from "../../config/index.js";

const userCooldowns = new Map();
const COOLDOWN_MS = 10 * 60 * 1000;
const { DARK_GRAY } = config.uiColors;

export const data = new SlashCommandBuilder()
  .setName("modpack")
  .setDescription("Get the modpack for Createrington server");

export const prodOnly = true;

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const now = Date.now();
    const lastUsed = userCooldowns.get(userId) || 0;
    const remaining = COOLDOWN_MS - (now - lastUsed);

    if (remaining > 0) {
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      return await interaction.reply({
        content: `⏳ Please wait ${minutes} minute(s) and ${seconds} second(s) before using this command again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    userCooldowns.set(userId, now);

    const embed = new EmbedBuilder()
      .setTitle("🛠 Createrington modpack")
      .setDescription(
        "Download the Createrington modpack through CurseForge with just 1 click."
      )
      .setColor(DARK_GRAY)
      .setURL("https://www.curseforge.com/minecraft/modpacks/create-rington")
      .setFooter({
        text: "Requires CurseForge installed on your device",
      });

    const button = new ButtonBuilder()
      .setLabel("Open CurseForge")
      .setStyle(ButtonStyle.Link)
      .setURL("https://www.curseforge.com/minecraft/modpacks/create-rington");

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error("/modpack failed:", error);
    await interaction.reply({
      content: `⚠️ Something went wrong. Try again later.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
