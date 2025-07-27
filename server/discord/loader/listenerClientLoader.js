import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

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
