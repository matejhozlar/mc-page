import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, "..");
const SEARCH_DIRS = ["client", "server"];
const OUTPUT_ZIP = path.join(
  ROOT_DIR,
  "server",
  "app",
  "routes",
  "download",
  "assets.zip"
);
const IGNORED_FOLDERS = new Set(["node_modules", "dist", "build", ".git"]);

function findAssetDirs(baseDir) {
  const assetDirs = [];

  function walk(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        if (IGNORED_FOLDERS.has(file.name)) {
          continue;
        }
        if (file.name === "assets") {
          assetDirs.push(fullPath);
        } else {
          walk(fullPath);
        }
      }
    }
  }

  walk(baseDir);
  return assetDirs;
}

async function zipAssets() {
  const zipDir = path.dirname(OUTPUT_ZIP);

  fs.mkdirSync(zipDir, { recursive: true });

  if (fs.existsSync(OUTPUT_ZIP)) {
    fs.unlinkSync(OUTPUT_ZIP);
    console.log("🗑️  Removed old assets.zip");
  }

  const output = fs.createWriteStream(OUTPUT_ZIP);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`✔️  Created ${OUTPUT_ZIP} (${archive.pointer()} total bytes)`);
  });

  archive.on("error", (error) => {
    throw error;
  });

  archive.pipe(output);

  for (const dirName of SEARCH_DIRS) {
    const fullBase = path.join(ROOT_DIR, dirName);
    const foundDirs = findAssetDirs(fullBase);

    for (const assetsPath of foundDirs) {
      const relativePath = path.relative(ROOT_DIR, assetsPath);
      archive.directory(assetsPath, relativePath);
      console.log(`📁 Added: ${relativePath}`);
    }
  }

  await archive.finalize();
}

zipAssets().catch((error) => {
  console.error("❌ Failed to create zip:", error);
  process.exit(1);
});
