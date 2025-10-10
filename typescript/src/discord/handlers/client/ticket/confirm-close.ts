import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  OverwriteType,
  PermissionFlagsBits,
  ChannelType,
  type ButtonInteraction,
  type Client,
  type TextChannel,
  type NewsChannel,
} from "discord.js";
import type { Pool } from "pg";
import logger from "../../../../logger";
/**
 * Handles the logic to close a ticket: hides the channel from the user,
 * posts an admin panel with options, and updates the ticket record in the database.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction that triggered the close.
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @param {import('pg').Pool} db - The PostgreSQL database connection pool or client.
 */
export default async function confirmCloseTicket(
  interaction: ButtonInteraction,
  _client: Client,
  db: Pool
): Promise<void> {
  const user = interaction.user;
  const channel = interaction.channel;

  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }
    await interaction.message.delete().catch(() => {});

    if (!channel) throw new Error("No channel on interaction.");

    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) {
      logger.warn(
        `Ticket close invoked in a channel without overwrites (type=${channel.type}). Skipping hide.`
      );
    } else {
      const textChannel = channel as TextChannel | NewsChannel;

      const memberOverwrite = textChannel.permissionOverwrites.cache.find(
        (po) =>
          po.type === OverwriteType.Member &&
          po.allow.has(PermissionFlagsBits.ViewChannel)
      );

      const memberId = memberOverwrite?.id;
      if (memberId) {
        await textChannel.permissionOverwrites.edit(memberId, {
          ViewChannel: false,
        });
      } else {
        logger.warn(
          "No member overwrite with ViewChannel found when closing ticket."
        );
      }
    }

    const closedBy = `<@${user.id}>`;
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription(`Ticket Closed by ${closedBy}`);

    const adminRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
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

    const adminPanelMessage = await (channel as TextChannel | NewsChannel).send(
      {
        embeds: [embed],
        components: [adminRow],
      }
    );

    await db.query(
      `UPDATE tickets SET admin_message_id = $1 WHERE channel_id = $2`,
      [adminPanelMessage.id, channel.id]
    );
  } catch (error) {
    logger.error(
      `Failed to close ticket: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    if (!interaction.replied) {
      await interaction
        .reply({
          content: "❌ Failed to close ticket.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
}
