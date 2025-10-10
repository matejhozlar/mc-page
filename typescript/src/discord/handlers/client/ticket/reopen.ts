import {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  type ButtonInteraction,
  type Client,
  type TextChannel,
  type NewsChannel,
} from "discord.js";
import type { Pool, PoolClient } from "pg";
import logger from "../../../../logger";

type Db = Pool | PoolClient;
/**
 * Reopens a previously closed ticket by updating permissions and database status.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction that triggered the reopening.
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @param {import('pg').Pool | import('pg').PoolClient} db - The database connection or client.
 */
export default async function reopenTicket(
  interaction: ButtonInteraction,
  _client: Client,
  db: Db
): Promise<void> {
  const channel = interaction.channel;
  if (!channel) {
    await safeReply(interaction, {
      content: "❌ No channel found for this interaction.",
      ephemeral: true,
    });
    return;
  }

  const channelId = channel.id;

  try {
    const result = await db.query<{ admin_message_id: string }>(
      `SELECT admin_message_id
         FROM tickets
        WHERE channel_id = $1
        LIMIT 1`,
      [channelId]
    );

    const adminMessageId = result.rows[0]?.admin_message_id;

    if (
      adminMessageId &&
      (channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildAnnouncement)
    ) {
      const textCh = channel as TextChannel | NewsChannel;
      const msg = await textCh.messages.fetch(adminMessageId).catch(() => null);
      if (msg) await msg.delete().catch(() => null);
    }
  } catch {}

  try {
    const result = await db.query<{ discord_id: string }>(
      `SELECT discord_id
         FROM tickets
        WHERE channel_id = $1
        LIMIT 1`,
      [channelId]
    );

    const originalUserId = result.rows[0]?.discord_id;

    if (!originalUserId) {
      await safeReply(interaction, {
        content: "❌ Could not find original ticket owner in the database.",
        ephemeral: true,
      });
      return;
    }

    if (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement
    ) {
      const textCh = channel as TextChannel | NewsChannel;

      await textCh.permissionOverwrites.edit(originalUserId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
    } else {
      logger.warn(
        `Reopen requested in a channel without overwrites (type=${channel.type}). Skipping permission edits.`
      );
    }

    await db.query(
      `UPDATE tickets
          SET status = 'open',
              updated_at = NOW()
        WHERE channel_id = $1`,
      [channelId]
    );

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }

    const reopenedEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`✅ Ticket has been reopened for <@${originalUserId}>`);

    if ("send" in channel && typeof (channel as any).send === "function") {
      await (channel as any).send({ embeds: [reopenedEmbed] });
    }
  } catch (error) {
    logger.error("Failed to reopen ticket:", error);
    await safeReply(interaction, {
      content: "⚠️ Something went wrong while reopening the ticket.",
      ephemeral: true,
    });
  }
}

async function safeReply(
  interaction: ButtonInteraction,
  options: { content: string; ephemeral?: boolean }
): Promise<void> {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply(options);
    } else {
      await interaction.followUp(options);
    }
  } catch {}
}
