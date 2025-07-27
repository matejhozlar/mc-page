export default async function cancelCloseTicket(interaction) {
  try {
    await interaction.message.delete().catch(console.error);
  } catch (error) {
    console.error("Failed to delete cancel confirmation message:", error);
  }
}
