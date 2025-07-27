import fs from "fs";
import path from "path";
import process from "process";
import glob from "fast-glob";

/**
 * Searches for usage of a specific environment variable in the project files.
 *
 * @param {string} envVar - The name of the environment variable to search for (e.g., "DB_PASSWORD").
 * @param {string} [searchDir=process.cwd()] - The directory to start searching from.
 * @returns {Array<{ file: string, line: number, content: string }>} - List of files and line numbers where the variable is used.
 */
const args = process.argv.slice(2);
const ENV_VAR = args[0];

if (!ENV_VAR) {
  console.error(
    "❌ Please provide an environment variable name, e.g.: npm run find-env DB_PASSWORD"
  );
  process.exit(1);
}

const SEARCH_DIR = path.resolve(".");
const IGNORE_DIRS = ["node_modules", "dist", "build", "client", ".git"];
const SUPPORTED_EXTENSIONS = ["js", "ts", "mjs", "cjs"];

const pattern = `**/*.{${SUPPORTED_EXTENSIONS.join(",")}}`;

const files = glob.sync(pattern, {
  cwd: SEARCH_DIR,
  ignore: IGNORE_DIRS.map((d) => `${d}/**`),
  absolute: true,
});

const results = [];

for (const file of files) {
  const lines = fs.readFileSync(file, "utf-8").split("\n");

  lines.forEach((line, i) => {
    const cleanLine = line
      .replace(/\/\/.*$/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    const regex = new RegExp(`process\\.env\\.?${ENV_VAR}\\b`);
    if (regex.test(cleanLine)) {
      results.push({ file, line: i + 1, content: line.trim() });
    }
  });
}

if (results.length === 0) {
  console.log(`❌ No usage found for ENV variable "${ENV_VAR}"`);
} else {
  console.log(`🔍 Found ${results.length} usage(s) of "${ENV_VAR}":\n`);
  for (const { file, line, content } of results) {
    const relPath = path.relative(SEARCH_DIR, file).replace(/\\/g, "/");
    console.log(`- ${relPath}:${line} → ${content}`);
  }
}
