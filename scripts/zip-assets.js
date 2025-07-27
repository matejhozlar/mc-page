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

/**
 * Recursively searches for directories named 'assets' inside the given base directory,
 * excluding any directories listed in IGNORED_FOLDERS.
 *
 * @param {string} baseDir - Absolute path to start the directory walk from.
 * @returns {string[]} - An array of full paths to all found 'assets' directories.
 */
function findAssetDirs(baseDir) {
  const assetDirs = [];

  /**
   * Walks through directories recursively to find 'assets' folders.
   *
   * @param {string} dir - Current directory being walked.
   */
  function walk(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        if (IGNORED_FOLDERS.has(file.name)) continue;
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

/**
 * Zips all discovered 'assets' directories from the SEARCH_DIRS into a single archive file.
 * The resulting zip is written to OUTPUT_ZIP.
 *
 * @async
 * @returns {Promise<void>} - Resolves when the zip archive is created successfully.
 */
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

// Run the zip operation
zipAssets().catch((error) => {
  console.error("❌ Failed to create zip:", error);
  process.exit(1);
});
