// src/services/rcon/sendRconCommand.ts
import { Rcon } from "rcon-client";
import dotenv from "dotenv";
import logger from "../../logger";

dotenv.config();

export interface RconConfig {
  host: string;
  port: number;
  password: string;
}

function readRconConfig(): RconConfig {
  const host = process.env.COGS_AND_STEAM_SERVER_IP;
  const portStr = process.env.COGS_AND_STEAM_RCON_PORT;
  const password = process.env.COGS_AND_STEAM_RCON_PASSWORD;

  if (!host) throw new Error("Missing env: COGS_AND_STEAM_SERVER_IP");
  if (!portStr) throw new Error("Missing env: COGS_AND_STEAM_RCON_PORT");
  const port = Number.parseInt(portStr, 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(
      "Invalid COGS_AND_STEAM_RCON_PORT (must be a positive integer)"
    );
  }
  if (!password) throw new Error("Missing env: COGS_AND_STEAM_RCON_PASSWORD");

  return { host, port, password };
}

/**
 * Sends a command to a Minecraft server using RCON.
 *
 * @param command - The command to send to the server.
 * @returns The server's response.
 * @throws If the RCON connection or command fails.
 */
export async function sendRconCommand(command: string): Promise<string> {
  const cfg = readRconConfig();
  let rcon: Rcon | null = null;

  try {
    rcon = await Rcon.connect({
      host: cfg.host,
      port: cfg.port,
      password: cfg.password,
    });

    const response = await rcon.send(command);
    logger.info(`RCON command sent: ${command}`);
    return response;
  } catch (error) {
    logger.error(
      `RCON command failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw new Error("Failed to send RCON command");
  } finally {
    if (rcon) {
      try {
        await rcon.end();
      } catch {}
    }
  }
}

export default sendRconCommand;
