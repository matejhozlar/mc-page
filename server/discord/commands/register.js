import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { Rcon } from "rcon-client";
import fetch from "node-fetch";
import { verifyNotifyStaff } from "../../services/verifyNotifyStaff.js";
import logger from "../../logger.js";
import logError from "../../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

function randomDelay(min = 1000, max = 5000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Register your Minecraft account")
  .addStringOption((option) =>
    option
      .setName("mc_name")
      .setDescription("Your exact Minecraft username (case doesn't matter)")
      .setRequired(true)
  );

export async function execute(interaction, db) {
  const mcName = interaction.options.getString("mc_name");
  const discordId = interaction.user.id;
  const member = interaction.member;

  const hasUnverified = member.roles.cache.has(
    process.env.DISCORD_UNVERIFIED_ROLE_ID
  );

  if (!hasUnverified) {
    return await interaction.reply({
      content: "❌ You are already verified or not eligible to register.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const verifiedCheck = await db.query(
    `SELECT * FROM verified_discords WHERE discord_id = $1`,
    [discordId]
  );

  if (verifiedCheck.rowCount === 0) {
    return await interaction.reply({
      content:
        "🚫 You haven't verified your token yet. Run `/verify <token>` first.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply({
    content: "🔍 Initiating registration sequence...",
    flags: MessageFlags.Ephemeral,
  });

  try {
    await randomDelay();
    await interaction.editReply({
      content: "📡 Checking Minecraft username existence...",
    });

    const response = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${mcName}`
    );
    if (!response.ok) {
      await verifyNotifyStaff(
        interaction,
        "Invalid Minecraft username",
        mcName
      );
      return await interaction.editReply({
        content: `❌ No Minecraft account found with the name \`${mcName}\`. A staff member has been notified.`,
      });
    }

    const { id: uuid, name: correctName } = await response.json();

    await randomDelay();
    await interaction.editReply({
      content: "🧠 Checking if your account is already registered...",
    });

    const exists = await db.query("SELECT * FROM users WHERE uuid = $1", [
      uuid,
    ]);
    if (exists.rowCount > 0) {
      await verifyNotifyStaff(
        interaction,
        "UUID already registered",
        mcName,
        uuid
      );
      return await interaction.editReply({
        content: `❌ This Minecraft account (\`${correctName}\`) is already registered.\n💬 A staff member has been notified.`,
      });
    }

    await randomDelay();
    await interaction.editReply({
      content: "🔑 Adding you to the whitelist...",
    });

    const rcon = await Rcon.connect({
      host: process.env.SERVER_IP,
      port: parseInt(process.env.RCON_PORT),
      password: process.env.RCON_PASSWORD,
    });
    await rcon.send(`whitelist add ${correctName}`);
    await rcon.end();

    await randomDelay();
    await interaction.editReply({
      content: "💾 Saving your information to the database...",
    });

    await db.query(
      `INSERT INTO users (uuid, name, discord_id, online, last_seen, session_start)
       VALUES ($1, $2, $3, false, NULL, NULL)`,
      [uuid, correctName, discordId]
    );

    await db.query(`DELETE FROM verified_discords WHERE discord_id = $1`, [
      discordId,
    ]);

    await randomDelay();
    await interaction.editReply({
      content: "🛠️ Finalizing your registration...",
    });

    const guildMember = await interaction.guild.members.fetch(discordId);
    await guildMember.roles.remove(process.env.DISCORD_UNVERIFIED_ROLE_ID);
    await guildMember.roles.add(process.env.DISCORD_PLAYER_ROLE_ID);

    const verifyChannel = interaction.guild.channels.cache.get(
      process.env.DISCORD_VERIFY_CHANNEL_ID
    );
    if (verifyChannel?.isTextBased()) {
      const messages = await verifyChannel.messages.fetch({ limit: 100 });
      const botMessages = messages.filter(
        (m) =>
          m.author.id === interaction.client.user.id ||
          m.author.id === interaction.user.id
      );
      await Promise.all(botMessages.map((msg) => msg.delete().catch(() => {})));
    }

    await randomDelay();
    await interaction.editReply({
      content: `✅ **Done!** You've been successfully registered and whitelisted as \`${correctName}\`. Welcome aboard! 🚂`,
    });
  } catch (error) {
    logger.error(`❌ Register command failed: ${logError(error)}`);
    await verifyNotifyStaff(
      interaction,
      `Unexpected Error: ${err.message}`,
      mcName
    );
    await interaction.editReply({
      content:
        "⚠️ Something went wrong. Please try again later or contact staff.\n💬 A staff member has been notified.",
    });
  }
}
