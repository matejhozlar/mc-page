import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import logger from "../../../../logger.js";

export default async function confirmCloseTicket(interaction, client, db) {
  const user = interaction.user;
  const channel = interaction.channel;

  try {
    await interaction.message.delete().catch(console.error);

    const memberId = channel.permissionOverwrites.cache.find(
      (po) => po.allow.has("ViewChannel") && po.type === 1
    )?.id;

    await channel.permissionOverwrites.edit(memberId, {
      ViewChannel: false,
    });

    const closedBy = `<@${user.id}>`;
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription(`Ticket Closed by ${closedBy}`);

    const adminRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_transcript")
        .setLabel("Transcript")
        .setEmoji("📄")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("reopen_ticket")
        .setLabel("Open")
        .setEmoji("🔓")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("delete_ticket")
        .setLabel("Delete")
        .setStyle(ButtonStyle.Danger)
    );

    const adminPanelMessage = await interaction.channel.send({
      embeds: [embed],
      components: [adminRow],
    });

    await db.query(
      `UPDATE tickets SET admin_message_id = $1 WHERE channel_id = $2`,
      [adminPanelMessage.id, interaction.channel.id]
    );
  } catch (error) {
    logger.error(`❌ Failed to close ticket: ${error}`);
    await interaction.reply({
      content: "❌ Failed to close ticket.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
