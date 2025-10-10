import {
  AttachmentBuilder,
  EmbedBuilder,
  ChannelType,
  type ButtonInteraction,
  type Client,
  type TextChannel,
  type NewsChannel,
  type ThreadChannel,
  type Snowflake,
} from "discord.js";
import type { Pool } from "pg";
import logger from "../../../../logger";
/**
 * Generates a transcript of the last 100 non-bot messages in a ticket channel,
 * saves it as a text file, and sends it to a designated transcript channel.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The interaction that triggered the transcript generation.
 * @param {import('discord.js').Client} client - The Discord bot client instance.
 * @param {import('pg').Pool} db - The PostgreSQL database connection pool.
 */
export default async function transcriptTicket(
  interaction: ButtonInteraction,
  _client: Client,
  db: Pool
): Promise<void> {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }

    const ch = interaction.channel;
    const guild = interaction.guild;
    if (!ch || !guild) {
      logger.warn(
        "Transcript requested outside of a guild or without a channel."
      );
      return;
    }

    let messagesMap:
      | Awaited<ReturnType<TextChannel["messages"]["fetch"]>>
      | Awaited<ReturnType<NewsChannel["messages"]["fetch"]>>
      | Awaited<ReturnType<ThreadChannel["messages"]["fetch"]>>;

    if (
      ch.type === ChannelType.GuildText ||
      ch.type === ChannelType.GuildAnnouncement
    ) {
      const textCh = ch as TextChannel | NewsChannel;
      messagesMap = await textCh.messages.fetch({ limit: 100 });
    } else if (ch.isThread?.()) {
      const threadCh = ch as ThreadChannel;
      messagesMap = await threadCh.messages.fetch({ limit: 100 });
    } else {
      logger.warn("Transcript requested in unsupported channel type:", ch.type);
      return;
    }

    const sorted = messagesMap.reverse();
    const contentBody = [...sorted.values()]
      .filter((m) => !m.author.bot)
      .map(
        (m) =>
          `[${m.createdAt.toISOString()}] ${m.author.tag}: ${
            m.content && m.content.trim().length > 0
              ? m.content
              : "[Embed/Attachment]"
          }`
      )
      .join("\n");

    const channelId = ch.id;
    const ticketResult = await db.query<{
      discord_id: string;
      mc_name: string | null;
      ticket_number: number;
      status: string;
      created_at: Date | null;
      updated_at: Date | null;
    }>(
      `SELECT t.discord_id, t.ticket_number, t.status, t.created_at, t.updated_at, u.name AS mc_name
         FROM tickets t
         LEFT JOIN users u ON t.discord_id = u.discord_id
        WHERE t.channel_id = $1
        LIMIT 1`,
      [channelId]
    );

    const ticket = ticketResult.rows[0];
    if (!ticket) {
      logger.warn("No ticket row found for channel", channelId);
    }

    const member = ticket
      ? await guild.members
          .fetch(ticket.discord_id as Snowflake)
          .catch(() => null)
      : null;
    const displayName =
      member?.displayName ??
      (ticket ? `Unknown (${ticket.discord_id})` : "Unknown");

    const transcriptHeader =
      `Ticket Transcript - ${("name" in ch && (ch as any).name) || channelId}\n\n` +
      `Discord User: ${displayName}${ticket ? ` (${ticket.discord_id})` : ""}\n` +
      `Minecraft Username: ${ticket?.mc_name ?? "Unknown"}\n` +
      `Ticket Number: ${ticket?.ticket_number ?? "N/A"}\n` +
      `Status: ${ticket?.status ?? "N/A"}\n` +
      `Created At: ${ticket?.created_at?.toISOString() ?? "N/A"}\n` +
      `Updated At: ${ticket?.updated_at?.toISOString() ?? "N/A"}\n\n` +
      `------------------------------------------------------------\n\n`;

    const fullTranscript = transcriptHeader + contentBody;
    const buffer = Buffer.from(fullTranscript, "utf-8");

    const transcriptFile = new AttachmentBuilder(buffer, {
      name: `transcript-${("name" in ch && (ch as any).name) || channelId}.txt`,
    });

    const transcriptChannelId = process.env.DISCORD_TRANSCRIPT_CHANNEL_ID as
      | Snowflake
      | undefined;
    if (!transcriptChannelId) {
      logger.warn("DISCORD_TRANSCRIPT_CHANNEL_ID is not set.");
      return;
    }

    const transcriptChannel =
      guild.channels.cache.get(transcriptChannelId) ??
      (await guild.channels.fetch(transcriptChannelId).catch(() => null));
    if (!transcriptChannel || !transcriptChannel.isTextBased()) {
      logger.warn("Transcript channel not found or not text-based.");
      return;
    }

    await transcriptChannel.send({
      content: `📄 Ticket transcript saved from **${("name" in ch && (ch as any).name) || channelId}**`,
      files: [transcriptFile],
    });

    const transcriptEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`Transcript has been saved to <#${transcriptChannelId}>`);

    if ("send" in ch && typeof (ch as any).send === "function") {
      await (ch as any).send({ embeds: [transcriptEmbed] });
    }
  } catch (error) {
    logger.error("Failed to save/send transcript:", error);
    const ch = interaction.channel;
    if (ch && "send" in ch && typeof (ch as any).send === "function") {
      await (ch as any)
        .send({ content: "⚠️ Failed to generate transcript." })
        .catch(() => {});
    }
  }
}
