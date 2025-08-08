import fs from "fs/promises";
import path from "path";

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveLocalImage(fileBuffer, rootDir, subdir, filename) {
  const safeRoot = rootDir || path.resolve(process.cwd(), "uploads");
  const targetDir = path.join(safeRoot, subdir);
  await ensureDir(targetDir);

  const absPath = path.join(targetDir, filename);
  await fs.writeFile(absPath, fileBuffer);

  const relative = path.join(subdir, filename).replaceAll("\\", "/");
  return { absPath, relative };
}
