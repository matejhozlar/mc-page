import { Rcon } from "rcon-client";
import dotenv from "dotenv";
import logError from "./logError.js";
import logger from "../logger.js";

dotenv.config();

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
    logger.error(`❌ RCON command failed: ${logError(error)}`);
    throw new Error("Failed to send RCON command");
  }
}
