import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";

const userCooldowns = new Map();
const COOLDOWN_MS = 10 * 60 * 1000;

export const data = new SlashCommandBuilder()
  .setName("map")
  .setDescription("View the live server map for Createrington");

export async function execute(interaction) {
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
    .setColor(0x2f3136)
    .setURL("https://create-rington.com/bluemap")
    .setFooter({
      text: "Requires JavaScript — works best on desktop browsers.",
    });

  const button = new ButtonBuilder()
    .setLabel("Open Map")
    .setStyle(ButtonStyle.Link)
    .setURL("https://create-rington.com/bluemap");

  const row = new ActionRowBuilder().addComponents(button);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}
