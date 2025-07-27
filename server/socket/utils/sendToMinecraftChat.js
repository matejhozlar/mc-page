import logger from "../../logger.js";

const MINECRAFT_CHANNEL_NAME = "minecraft-chat";

export async function sendToMinecraftChat(message, webBot) {
  try {
    const guild = await webBot.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const channel = guild.channels.cache.find(
      (ch) => ch.name === MINECRAFT_CHANNEL_NAME
    );

    if (channel?.isTextBased()) {
      await channel.send(message);
    }
  } catch (err) {
    logger.error(`❌ Failed to send message to Minecraft chat: ${err}`);
  }
}
