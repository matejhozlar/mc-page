import fs from "fs";
import path from "path";
import process from "process";
import glob from "fast-glob";

/**
 * @fileoverview Finds all project files that import a specific file (by name).
 *
 * @param {string} process.argv[2] - The file name (with extension) to search for.
 *   Example: "index.js", "chatMessage.ts"
 *
 * @example
 *   node scripts/dependency/findImportUsage.js index.js
 *
 * @description
 *   Scans JS/TS source files in the project and prints every file where the target file
 *   is imported using either `import ... from` or `require(...)`.
 */
const [targetFilename] = process.argv.slice(2);

if (!targetFilename) {
  console.error(
    "❌ Please provide a file name with extension, e.g.: npm run find-import index.js"
  );
  process.exit(1);
}

const SEARCH_DIR = path.resolve(".");
const IGNORE_DIRS = ["node_modules", "dist", "build", ".git", "client"];
const SUPPORTED_EXTENSIONS = ["js", "ts", "mjs", "cjs"];

const pattern = `**/*.{${SUPPORTED_EXTENSIONS.join(",")}}`;

const files = glob.sync(pattern, {
  cwd: SEARCH_DIR,
  ignore: IGNORE_DIRS.map((d) => `${d}/**`),
  absolute: true,
});

const matches = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");

  const sanitized = content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//gm, "");

  const regex = new RegExp(
    `(?:import\\s.+?from\\s+|require\\()(['"\`].*?${targetFilename.replace(
      ".",
      "\\."
    )}['"\`])`,
    "g"
  );

  const lines = sanitized.split("\n");

  lines.forEach((line, i) => {
    if (regex.test(line)) {
      matches.push({
        file,
        line: i + 1,
        content: line.trim(),
      });
    }
  });
}

if (matches.length === 0) {
  console.log(`❌ No imports found for file "${targetFilename}"`);
} else {
  console.log(`Found ${matches.length} import(s) of "${targetFilename}":\n`);
  for (const { file, line, content } of matches) {
    const relPath = path.relative(SEARCH_DIR, file).replace(/\\/g, "/");
    console.log(`- ${relPath}:${line} → ${content}`);
  }
}
