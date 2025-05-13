import { Rcon } from "rcon-client";
import logger from "../logger.jsx";
import logError from "../utils/logError.js";
import dotenv from "dotenv";

dotenv.config();

async function whitelistPlayer(playerName) {
  try {
    const rcon = await Rcon.connect({
      host: process.env.SERVER_IP,
      port: process.env.RCON_PORT,
      password: process.env.RCON_PASSWORD,
    });

    logger.info(`Connected to RCON. Whitelisting player: ${playerName}...`);

    const response = await rcon.send(`whitelist add ${playerName}`);
    logger.info(`Server response: ${response}`);

    rcon.end();
  } catch (error) {
    logger.error(`Error connecting to RCON: ${logError(error)}`);
  }
}

const playerName = process.argv[2];
if (!playerName) {
  logger.info("Usage: node whitelist.js <playerName>");
  process.exit(1);
}

whitelistPlayer(playerName);
