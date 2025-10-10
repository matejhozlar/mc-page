import fs from "fs";
import path from "path";
import logger from "./logger.js";

const envSource = path.resolve(".env");

const targetDirs = [
  "./services",
  "./services/crypto",
  "./utils",
  "./utils/crypto",
  "./discord/commands",
  "./discord/notifiers",
  "./routes",
  "./tests",
  "./discord/listeners",
  "./bin",
  "./bin/guides",
  "./bin/invites",
  "./bin/trash",
  "./bin/announcements",
  "./AI",
];

export function syncEnv() {
  if (!fs.existsSync(envSource)) {
    logger.error("❌ .env file not found at project root.");
    process.exit(1);
  }

  for (const dir of targetDirs) {
    const dest = path.join(dir, ".env");

    try {
      fs.copyFileSync(envSource, dest);
    } catch (error) {
      logger.error(`❌ Failed to copy to ${dest}: ${error}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncEnv();
}
