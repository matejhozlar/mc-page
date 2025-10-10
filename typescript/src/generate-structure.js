import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IGNORE = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "out",
  ".DS_Store",
];

function printTree(dir, prefix = "") {
  const items = fs.readdirSync(dir).filter((item) => !IGNORE.includes(item));
  const lastIndex = items.length - 1;

  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isDir = fs.statSync(fullPath).isDirectory();
    const isLast = index === lastIndex;

    const connector = isLast ? "└──" : "├──";
    console.log(`${prefix}${connector} ${item}`);

    if (isDir) {
      const nextPrefix = prefix + (isLast ? "    " : "│   ");
      printTree(fullPath, nextPrefix);
    }
  });
}

console.log("Project Folder Structure:\n");
printTree(__dirname);
