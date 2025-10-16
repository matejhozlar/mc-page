import {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  MessageFlags,
} from "discord.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../../logger.js";
import config from "../../config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const COOLDOWN_MS = 10 * 60 * 1000;
const userCooldowns = new Map();
const { BLUE } = config.uiColors;

export const data = new SlashCommandBuilder()
  .setName("stats-guide")
  .setDescription("Learn how to use the /stats command with examples");

export const prodOnly = true;

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const now = Date.now();

    if (
      userCooldowns.has(userId) &&
      now - userCooldowns.get(userId) < COOLDOWN_MS
    ) {
      const remainingMs = COOLDOWN_MS - (now - userCooldowns.get(userId));
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);

      return await interaction.reply({
        content: `⏳ Please wait ${minutes} minute(s) and ${seconds} second(s) before using this command again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    userCooldowns.set(userId, now);

    const spamChannelId = process.env.DISCORD_BOT_SPAM_CHANNEL_ID;

    const fullCommandImage = new AttachmentBuilder(
      path.join(__dirname, "..", "assets", "full_command.png")
    ).setName("full_command.png");

    const embed = new EmbedBuilder()
      .setTitle("📊 How to Use `/stats`")
      .setDescription(
        "Use `/stats` to view the **top 5 players** for any Minecraft stat.\nJust pick the stat type and what it's tracking."
      )
      .addFields(
        {
          name: "🧩 How it works",
          value:
            "**stat_type** → the category (e.g. `mined`, `killed`, `crafted`)\n" +
            "**stat_key** → what is tracked (e.g. `minecraft:diamond_ore`, `create:mechanical_pump`)",
        },
        {
          name: "✅ Full Command Example",
          value:
            "```/stats \nstat_type: mined \nstat_key: create:mechanical_pump```\n" +
            "This shows who mined the most mechanical pumps from the Create mod.",
        },
        {
          name: "📂 Available Stat Types",
          value:
            "`broken`, `crafted`, `custom`, `dropped`, `killed`, `killed_by`, `mined`, `picked_up`, `used`",
        },
        {
          name: "ℹ️ Tips",
          value:
            "- You can skip `minecraft:` — it's added automatically.\n" +
            "- Modded items **must** include their prefix (e.g. `create:`)\n" +
            "- Use `/stats-info` to explore available stat types and keys.",
        }
      )
      .addFields({
        name: "⏳ Cooldown",
        value: `Once per hour per channel\nOr use it freely in <#${spamChannelId}>`,
      })
      .setImage("attachment://full_command.png")
      .setColor(BLUE)
      .setFooter({ text: "Stat Guide" });

    await interaction.reply({
      embeds: [embed],
      files: [fullCommandImage],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error("/stats-guide failed:", error);
    await interaction.reply({
      content: `⚠️ Something went wrong. Try again later.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
