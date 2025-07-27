import { EmbedBuilder, MessageFlags } from "discord.js";
import logger from "../../../../logger.js";

/**
 * Reopens a previously closed ticket by updating permissions and database status.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction that triggered the reopening.
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @param {import('pg').Pool | import('pg').PoolClient} db - The database connection or client.
 */
export default async function reopenTicket(interaction, client, db) {
  const channelId = interaction.channel.id;

  const result = await db.query(
    `SELECT discord_id, admin_message_id FROM tickets WHERE channel_id = $1 LIMIT 1`,
    [channelId]
  );

  const adminMessageId = result.rows[0]?.admin_message_id;

  if (adminMessageId) {
    const msg = await interaction.channel.messages
      .fetch(adminMessageId)
      .catch(() => null);
    if (msg) await msg.delete().catch(() => null);
  }

  try {
    const result = await db.query(
      `SELECT discord_id FROM tickets WHERE channel_id = $1 LIMIT 1`,
      [channelId]
    );

    const originalUserId = result.rows[0]?.discord_id;

    if (originalUserId) {
      await interaction.channel.permissionOverwrites.edit(originalUserId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      await db.query(
        `UPDATE tickets SET status = 'open', updated_at = NOW() WHERE channel_id = $1`,
        [channelId]
      );

      await interaction.deferUpdate();
      const reopenedEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`✅ Ticket has been reopened for <@${originalUserId}>`);

      await interaction.channel.send({
        embeds: [reopenedEmbed],
      });
    } else {
      await interaction.reply({
        content: "❌ Could not find original ticket owner in the database.",
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    logger.error(`❌ Failed to reopen ticket: ${error}`);
    await interaction.reply({
      content: "⚠️ Something went wrong while reopening the ticket.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
