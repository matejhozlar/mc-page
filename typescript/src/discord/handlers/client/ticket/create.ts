import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
  type Snowflake,
  type TextChannel,
} from "discord.js";
import type { Pool, PoolClient } from "pg";
import logger from "../../../../logger";

type Db = Pool | PoolClient;
/**
 * Handles creation of a new support ticket channel for the user.
 * Ensures only one open ticket per user, assigns permissions,
 * updates database, and notifies user.
 *
 * @param {import('discord.js').Interaction} interaction - The interaction object triggered by the user.
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @param {import('pg').Pool | import('pg').PoolClient} db - PostgreSQL database client or pool.
 */
export default async function createTicket(
  interaction: ChatInputCommandInteraction,
  client: Client,
  db: Db
): Promise<void> {
  try {
    const guild = interaction.guild;
    const user = interaction.user;

    if (!guild) {
      await interaction.reply({
        content: "❌ This command must be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID as
      | Snowflake
      | undefined;
    if (!adminRoleId) {
      logger.warn("DISCORD_ADMIN_ROLE_ID is not set.");
    }

    const existing = await db.query<{ channel_id: string }>(
      `SELECT channel_id
         FROM tickets
        WHERE discord_id = $1
          AND status <> 'deleted'
        LIMIT 1`,
      [user.id]
    );

    if (existing.rows.length > 0) {
      const channelId = existing.rows[0]?.channel_id;
      await interaction.reply({
        content: channelId
          ? `❌ You already have a ticket open: <#${channelId}>`
          : "❌ You already have a ticket open.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const userRow = await db.query<{ name: string }>(
      `SELECT name FROM users WHERE discord_id = $1 LIMIT 1`,
      [user.id]
    );
    const mcName = userRow.rows[0]?.name ?? "Unknown";

    const counterRes = await db.query<{ last_number: number }>(
      `SELECT last_number FROM ticket_counter WHERE id = 1`
    );
    const lastNumber = counterRes.rows[0]?.last_number ?? 0;
    const ticketNumber = lastNumber + 1;

    await db.query(`UPDATE ticket_counter SET last_number = $1 WHERE id = 1`, [
      ticketNumber,
    ]);

    const ticketName = `ticket-${ticketNumber.toString().padStart(4, "0")}`;

    const ticketChannel = (await guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: client.user!.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        ...(adminRoleId
          ? [
              {
                id: adminRoleId,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.ManageMessages,
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.EmbedLinks,
                ],
              },
            ]
          : []),
      ],
    })) as TextChannel;

    await db.query(
      `INSERT INTO tickets (ticket_number, discord_id, mc_name, channel_id)
       VALUES ($1, $2, $3, $4)`,
      [ticketNumber, user.id, mcName, ticketChannel.id]
    );

    const welcomeEmbed = new EmbedBuilder()
      .setDescription(
        `👋 Welcome <@${user.id}> (Minecraft: **${mcName}**)
        \nPlease describe your issue in detail and include any screenshots or videos.
        \nSupport will be with you shortly <@&${adminRoleId}>
        \nTo close this ticket, press the **Close** button below.`
      )
      .setColor(0x2f3136)
      .addFields({
        name: " ",
        value: "[Createrington](https://create-rington.com)",
      });

    const closeButton = new ButtonBuilder()
      .setCustomId("start_close_ticket")
      .setLabel("Close")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔒");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      closeButton
    );

    await ticketChannel.send({
      embeds: [welcomeEmbed],
      components: [row],
    });

    await interaction.reply({
      content: `✅ Your ticket has been created: ${ticketChannel}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error("Failed to create ticket:", error);
    try {
      if (!interaction.replied) {
        await interaction.reply({
          content: "⚠️ Failed to create ticket. Please try again later.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {}
  }
}
