import { Rcon } from "rcon-client";
import dotenv from "dotenv";
import logger from "../../logger.js";

dotenv.config();

/**
 * Sends a command to a Minecraft server using RCON.
 *
 * @param {string} command - The command to send to the server.
 * @returns {Promise<string>} - The server's response to the command.
 *
 * @throws {Error} If the RCON connection or command fails.
 */
export async function sendRconCommand(command) {
  try {
    const rcon = await Rcon.connect({
      host: process.env.SERVER_IP,
      port: parseInt(process.env.RCON_PORT),
      password: process.env.RCON_PASSWORD,
    });

    const response = await rcon.send(command);
    await rcon.end();

    logger.info(`✅ RCON command sent: ${command}`);
    return response;
  } catch (error) {
    logger.error(`❌ RCON command failed: ${error}`);
    throw new Error("Failed to send RCON command");
  }
}
