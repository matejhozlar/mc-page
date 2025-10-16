import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import logger from "../../../../logger.js";

/**
 * Generates a transcript of the last 100 non-bot messages in a ticket channel,
 * saves it as a text file, and sends it to a designated transcript channel.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The interaction that triggered the transcript generation.
 * @param {import('discord.js').Client} client - The Discord bot client instance.
 * @param {import('pg').Pool} db - The PostgreSQL database connection pool.
 */
export default async function transcriptTicket(interaction, client, db) {
  try {
    await interaction.deferUpdate();

    const channelId = interaction.channel.id;
    const transcriptChannelId = process.env.DISCORD_TRANSCRIPT_CHANNEL_ID;
    const guild = interaction.guild;

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const sorted = messages.reverse();
    const contentBody = sorted
      .filter((m) => !m.author.bot)
      .map(
        (m) =>
          `[${m.createdAt.toISOString()}] ${m.author.tag}: ${
            m.content || "[Embed/Attachment]"
          }`
      )
      .join("\n");

    const ticketResult = await db.query(
      `SELECT t.*, u.name AS mc_name 
       FROM tickets t 
       LEFT JOIN users u ON t.discord_id = u.discord_id 
       WHERE t.channel_id = $1 LIMIT 1`,
      [channelId]
    );

    const ticket = ticketResult.rows[0];
    const member = await guild.members
      .fetch(ticket.discord_id)
      .catch(() => null);
    const displayName = member?.displayName || `Unknown (${ticket.discord_id})`;

    const transcriptHeader = `Ticket Transcript - ${
      interaction.channel.name
    }\n\nDiscord User: ${displayName} (${
      ticket.discord_id
    })\nMinecraft Username: ${ticket.mc_name || "Unknown"}\nTicket Number: ${
      ticket.ticket_number
    }\nStatus: ${
      ticket.status
    }\nCreated At: ${ticket.created_at?.toISOString()}\nUpdated At: ${ticket.updated_at?.toISOString()}\n\n------------------------------------------------------------\n\n`;

    const fullTranscript = transcriptHeader + contentBody;
    const buffer = Buffer.from(fullTranscript, "utf-8");

    const transcriptFile = new AttachmentBuilder(buffer, {
      name: `transcript-${interaction.channel.name}.txt`,
    });

    const transcriptChannel = guild.channels.cache.get(transcriptChannelId);
    if (!transcriptChannel || !transcriptChannel.isTextBased()) {
      logger.warn("Transcript channel not found or not text-based.");
      return;
    }

    await transcriptChannel.send({
      content: `📄 Ticket transcript saved from **${interaction.channel.name}**`,
      files: [transcriptFile],
    });

    const transcriptEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`Transcript has been saved to <#${transcriptChannelId}>`);

    await interaction.channel.send({
      embeds: [transcriptEmbed],
    });
  } catch (error) {
    logger.error("Failed to save/send transcript:", error);
    await interaction.channel.send({
      content: "⚠️ Failed to generate transcript.",
    });
  }
}
