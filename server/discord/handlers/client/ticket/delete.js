import { EmbedBuilder } from "discord.js";

const deleteTicket = async (interaction, client, db) => {
  await interaction.deferUpdate();

  const channelId = interaction.channel.id;

  const embed = new EmbedBuilder()
    .setDescription("Ticket will be deleted in a few seconds")
    .setColor(0xed4245);

  await interaction.channel.send({ embeds: [embed] });

  await db.query(
    `UPDATE tickets SET status = 'deleted', updated_at = NOW() WHERE channel_id = $1`,
    [channelId]
  );

  setTimeout(() => {
    interaction.channel.delete().catch(console.error);
  }, 5000);
};

export default deleteTicket;
