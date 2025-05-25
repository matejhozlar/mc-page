import { askAssitant } from "../../AI/openaiAssistant.js";
import logError from "../../utils/logError.js";
import logger from "../../logger.js";
import dotenv from "dotenv";
import { MessageFlags } from "discord.js";

dotenv.config();

const aiCooldowns = new Map();
const COOLDOWN_MS = 60 * 1000;

export default function setupAIChatListener(client) {
  const AI_CHANNEL_ID = process.env.DISCORD_AI_CHANNEL_ID;

  if (!AI_CHANNEL_ID) {
    logger.warn("⚠️ No DISCORD_AI_CHAT_CHANNEL_ID set in .env");
    return;
  }

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.channel.id !== AI_CHANNEL_ID) return;

    const userId = message.author.id;
    const now = Date.now();
    const lastUsed = aiCooldowns.get(userId) || 0;

    const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);

    if (now - lastUsed < COOLDOWN_MS) {
      return message.reply(
        `⏳ Please wait **${remaining} second${
          remaining !== 1 ? "s" : ""
        }** before asking again.`
      );
    }

    aiCooldowns.set(userId, now);

    try {
      await message.channel.sendTyping();
      const response = await askAssitant(message.content);
      await message.reply(response);
    } catch (error) {
      logger.error("❌ AI Chat Error:", logError(error));
      await message.reply("⚠️ The assistant encountered an error.");
    }
  });
}
