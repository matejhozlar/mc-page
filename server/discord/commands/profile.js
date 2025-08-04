import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import logger from "../../logger.js";
import dotenv from "dotenv";
import { DateTime } from "luxon";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("profile")
  .setDescription(
    "Show your Minecraft profile: balance, playtime, tokens, and more"
  );

export const prodOnly = false;

export async function execute(interaction, db) {
  const discordId = interaction.user.id;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT u.name, u.uuid, u.play_time_seconds, u.online, u.last_seen, u.first_joined, uf.balance
       FROM users u
       JOIN user_funds uf ON u.uuid = uf.uuid
       WHERE u.discord_id = $1 FOR UPDATE`,
      [discordId]
    );

    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return await interaction.reply({
        content: `❌ You don’t have your Minecraft account linked yet. Use **/link <username>** to connect your account.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const {
      name,
      uuid,
      play_time_seconds,
      online,
      last_seen,
      first_joined,
      balance,
    } = userRes.rows[0];

    const formattedBalance = Math.floor(parseFloat(balance)).toLocaleString(
      "en-US"
    );
    const hours = Math.floor(play_time_seconds / 3600);
    const minutes = Math.floor((play_time_seconds % 3600) / 60);

    const tokenRes = await client.query(
      `SELECT ct.name, ut.amount
       FROM user_tokens ut
       JOIN crypto_tokens ct ON ut.token_id = ct.id
       WHERE ut.discord_id = $1`,
      [discordId]
    );

    const tokenLines = tokenRes.rows.map(
      ({ name, amount }) => `• **${name}**: ${parseFloat(amount).toFixed(2)}`
    );

    const portfolioRes = await client.query(
      `
  SELECT SUM(ut.amount * ct.price_per_unit) AS portfolio_value
  FROM user_tokens ut
  JOIN crypto_tokens ct ON ut.token_id = ct.id
  WHERE ut.discord_id = $1
`,
      [discordId]
    );

    const portfolioValue =
      portfolioRes.rows[0].portfolio_value !== null
        ? `$${parseFloat(portfolioRes.rows[0].portfolio_value).toLocaleString(
            "en-US",
            { maximumFractionDigits: 2 }
          )}`
        : "*None*";

    await client.query("COMMIT");

    const embed = new EmbedBuilder()
      .setColor(0x00ae86)
      .setTitle(`${name}'s Createrington Profile`)
      .setDescription(
        `**💰 Balance:**\n$${formattedBalance}\n` +
          `**🕒 Playtime:**\n${hours}h ${minutes}m\n` +
          `**📊 Portfolio:**\n${portfolioValue}\n` +
          `**📡 Status:**\n${
            online
              ? "🟢 Online"
              : `🔴 Last seen: ${DateTime.fromJSDate(last_seen).toRelative()}`
          }\n` +
          `**📅 Joined:**\n${DateTime.fromJSDate(first_joined).toLocaleString(
            DateTime.DATE_MED
          )}`
      )
      .addFields({
        name: "🪙 Tokens",
        value: tokenLines.length > 0 ? tokenLines.join("\n") : "*None*",
      })
      .setFooter({
        text: "Createrington Profile",
      });

    return await interaction.reply({
      embeds: [embed],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(`❌ /profile command failed: ${error}`);
    return await interaction.reply({
      content: "⚠️ Something went wrong while fetching your profile.",
      flags: MessageFlags.Ephemeral,
    });
  } finally {
    client.release();
  }
}
