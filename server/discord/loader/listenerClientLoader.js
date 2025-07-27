import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

/**
 * Dynamically loads and registers all client event listeners from the `discord/listeners/client` directory.
 *
 * @param {import('discord.js').Client} client - The Discord client instance to register listeners on.
 * @param {object} [deps={}] - Optional dependencies to pass to each listener function (e.g., db connection).
 */
export async function registerClientListeners(client, deps = {}) {
  const listenersDir = path.resolve("discord/listeners/client");
  const files = fs.readdirSync(listenersDir).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const fullPath = path.join(listenersDir, file);
    const module = await import(pathToFileURL(fullPath));

    if (typeof module.default === "function") {
      module.default(client, deps);
    }
  }
}
