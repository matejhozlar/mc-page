import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import logger from "../../logger.js";
import config from "../../config/index.js";

const userCooldowns = new Map();
const COOLDOWN_MS = 10 * 60 * 1000;
const { DARK_GRAY } = config.uiColors;

export const data = new SlashCommandBuilder()
  .setName("map")
  .setDescription("View the live server map for Createrington");

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
      .setTitle("🗺️ Live Server Map")
      .setDescription("Explore the Createrington world in real time.")
      .setColor(DARK_GRAY)
      .setURL("https://create-rington.com/bluemap")
      .setFooter({
        text: "Requires JavaScript — works best on desktop browsers.",
      });

    const button = new ButtonBuilder()
      .setLabel("Open Map")
      .setStyle(ButtonStyle.Link)
      .setURL("https://create-rington.com/blue-map");

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`/modpack command failed: ${error}`);
    await interaction.reply({
      content: `⚠️ Something went wrong. Try again later.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
