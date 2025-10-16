import logger from "../../../logger.js";

export async function sendDm(discordId, message, clientBot) {
  try {
    const user = await clientBot.users.fetch(discordId);
    await user.send(message);
    return true;
  } catch (error) {
    logger.warn(`Failed to DM ${discordId}:`, error);
    return false;
  }
}
