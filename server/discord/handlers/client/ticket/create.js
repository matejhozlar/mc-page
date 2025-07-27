import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
  MessageFlags,
} from "discord.js";

import logger from "../../../../logger.js";

export default async function createTicket(interaction, client, db) {
  try {
    const guild = interaction.guild;
    const user = interaction.user;

    const existing = await db.query(
      `SELECT * FROM tickets WHERE discord_id = $1 AND status != 'deleted' LIMIT 1`,
      [user.id]
    );

    if (existing.rows.length > 0) {
      await interaction.reply({
        content: `❌ You already have a ticket open: <#${existing.rows[0].channel_id}>`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { rows } = await db.query(
      `SELECT name FROM users WHERE discord_id = $1 LIMIT 1`,
      [user.id]
    );
    const mcName = rows[0]?.name || "Unknown";

    const result = await db.query(
      `SELECT last_number FROM ticket_counter WHERE id = 1`
    );
    let ticketNumber = result.rows[0].last_number + 1;

    const ticketName = `ticket-${ticketNumber.toString().padStart(4, "0")}`;

    await db.query(`UPDATE ticket_counter SET last_number = $1 WHERE id = 1`, [
      ticketNumber,
    ]);

    const ticketChannel = await guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: ["ViewChannel"] },
        {
          id: user.id,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
        },
        {
          id: client.user.id,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
        },
        {
          id: process.env.DISCORD_ADMIN_ROLE_ID,
          allow: [
            "ViewChannel",
            "SendMessages",
            "ReadMessageHistory",
            "ManageMessages",
            "ManageChannels",
            "AttachFiles",
            "EmbedLinks",
          ],
        },
      ],
    });

    await db.query(
      `INSERT INTO tickets (ticket_number, discord_id, mc_name, channel_id) VALUES ($1, $2, $3, $4)`,
      [ticketNumber, user.id, mcName, ticketChannel.id]
    );

    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
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

    const row = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({
      embeds: [welcomeEmbed],
      components: [row],
    });

    await interaction.reply({
      content: `✅ Your ticket has been created: ${ticketChannel}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error(`❌ Failed to create ticket: ${error}`);
    await interaction.reply({
      content: "⚠️ Failed to create ticket. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
