import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("setup-ticket")
  .setDescription("Sends the ticket creation embed to the ticket channel");

export async function execute(interaction) {
  const ticketChannelId = process.env.DISCORD_TICKET_MESSAGE_CHANNEL_ID;
  const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

  console.log("Ticket Channel ID:", ticketChannelId);
  console.log("Ticket Channel:", ticketChannel?.name);

  if (!ticketChannel || !ticketChannel.isTextBased()) {
    return await interaction.reply({
      content: "❌ Ticket channel not found or is not text-based.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("🎟️ Support Ticket")
    .setDescription(
      "To create a ticket, click the **Create ticket** button below."
    )
    .setColor(0x2f3136)
    .addFields({
      name: "Need help?",
      value: "Click the button below to open a private support thread.",
    })
    .addFields({
      name: " ",
      value: "[Createrington](https://create-rington.com)",
    });

  const createButton = new ButtonBuilder()
    .setCustomId("create_ticket")
    .setLabel("Create ticket")
    .setEmoji("🎫")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(createButton);

  await ticketChannel.send({
    embeds: [embed],
    components: [row],
  });

  await interaction.reply({
    content: `✅ Ticket creation message sent to <#${ticketChannelId}>`,
    flags: MessageFlags.Ephemeral,
  });
}
