import { SlashCommandBuilder, MessageFlags } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const OWNER_ROLE_ID = process.env.DISCORD_OWNER_ROLE_ID;

export const data = new SlashCommandBuilder()
  .setName("message")
  .setDescription("Send a custom message to this channel (owner only)")
  .addStringOption((option) =>
    option
      .setName("content")
      .setDescription("The message to send")
      .setRequired(true)
  );

export const prodOnly = false;

/**
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 */
export async function execute(interaction) {
  const member = interaction.member;
  const content = interaction.options.getString("content");

  const hasOwnerRole = member.roles.cache.has(OWNER_ROLE_ID);

  if (!hasOwnerRole) {
    return await interaction.reply({
      content: "❌ You do not have permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await interaction.channel.send(content);
    await interaction.reply({
      content: "✅ Message sent.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error("❌ Failed to send message:", error);
    await interaction.reply({
      content: "⚠️ Failed to send the message.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
