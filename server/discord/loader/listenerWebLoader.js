import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

/**
 * Dynamically loads and registers all web event listeners from the `discord/listeners/web` directory.
 *
 * @param {import('discord.js').Client} client - The Discord client instance to register listeners on.
 * @param {object} [deps={}] - Optional dependencies to pass to each listener (e.g., database, socket, etc.).
 */
export async function registerWebListeners(client, deps = {}) {
  const listenersDir = path.resolve("discord/listeners/web");
  const files = fs.readdirSync(listenersDir).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const fullPath = path.join(listenersDir, file);
    const module = await import(pathToFileURL(fullPath));

    if (typeof module.default === "function") {
      module.default(client, deps);
    }
  }
}
