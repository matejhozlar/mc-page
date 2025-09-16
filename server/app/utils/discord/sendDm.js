import logger from "../../../logger.js";

export async function sendDm(discordId, message, clientBot) {
  try {
    const user = await clientBot.users.fetch(discordId);
    await user.send(message);
    return true;
  } catch (err) {
    logger.warn(`Failed to DM ${discordId}: ${err}`);
    return false;
  }
}
