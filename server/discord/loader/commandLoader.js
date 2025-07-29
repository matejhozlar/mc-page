import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import logger from "../../logger.js";

/**
 * Loads Discord command handlers from /discord/commands folder.
 * @returns {Promise<Map<string, object>>} commandHandlers
 */
export async function loadCommandHandlers() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const isDev = process.env.NODE_ENV !== "production";

  const commandsPath = path.join(__dirname, "../commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  const commandHandlers = new Map();

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const commandModule = await import(pathToFileURL(filePath).href);

      const isValid =
        commandModule.data && typeof commandModule.execute === "function";
      const isProdOnly = commandModule.prodOnly === true;

      if (!isValid) {
        logger.warn(`⚠️ Skipped loading ${file} — missing data or execute()`);
        continue;
      }

      if (isDev && isProdOnly) {
        logger.info(`🛑 Skipped production-only command: ${file}`);
        continue;
      }

      commandHandlers.set(commandModule.data.name, commandModule);
    } catch (error) {
      logger.error(`❌ Failed to load command ${file}: ${error}`);
    }
  }

  logger.info(`✅ Loaded ${commandHandlers.size} Discord command(s).`);
  return commandHandlers;
}
