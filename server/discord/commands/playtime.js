import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("playtime")
  .setDescription("Check your own or another player's playtime")
  .addStringOption((option) =>
    option
      .setName("mc_name")
      .setDescription("Minecraft username (optional)")
      .setRequired(false)
  );

export async function execute(interaction, db) {
  const requestedName = interaction.options.getString("mc_name");
  const discordId = interaction.user.id;

  try {
    let userData;

    if (requestedName) {
      userData = await db.query(
        `SELECT name, play_time_seconds FROM users WHERE LOWER(name) = LOWER($1)`,
        [requestedName]
      );

      if (userData.rowCount === 0) {
        return await interaction.reply({
          content: `❌ No player found with the name \`${requestedName}\`.`,
          ephemeral: true,
        });
      }
    } else {
      userData = await db.query(
        `SELECT name, play_time_seconds FROM users WHERE discord_id = $1`,
        [discordId]
      );

      if (userData.rowCount === 0) {
        return await interaction.reply({
          content: `❌ You don’t have your Minecraft account linked yet. Use **/link <username>** to connect your account.`,
          ephemeral: true,
        });
      }
    }

    const { play_time_seconds, name } = userData.rows[0] || {};
    if (!play_time_seconds) {
      return await interaction.reply({
        content: `⏳ No playtime recorded yet for **${name}**.`,
        ephemeral: true,
      });
    }

    const hours = Math.floor(play_time_seconds / 3600);
    const minutes = Math.floor((play_time_seconds % 3600) / 60);

    return await interaction.reply({
      content: `🕹️ **${name}** has played for **${hours}h ${minutes}m** in total.`,
      ephemeral: true,
    });
  } catch (err) {
    console.error("❌ Failed to fetch playtime:", err);
    return await interaction.reply({
      content:
        "⚠️ Something went wrong while fetching playtime. Please try again later.",
      ephemeral: true,
    });
  }
}
