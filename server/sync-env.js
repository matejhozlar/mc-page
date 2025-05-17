// sync-env.js
import fs from "fs";
import path from "path";

const envSource = path.resolve(".env");

const targetDirs = [
  "./services",
  "./utils",
  "./discord/commands",
  "./routes",
  "./tests",
  "./discord/listeners",
];

if (!fs.existsSync(envSource)) {
  console.error("❌ .env file not found at project root.");
  process.exit(1);
}

for (const dir of targetDirs) {
  const dest = path.join(dir, ".env");

  try {
    fs.copyFileSync(envSource, dest);
    console.log(`✅ Copied .env to ${dest}`);
  } catch (err) {
    console.error(`❌ Failed to copy to ${dest}:`, err.message);
  }
}
