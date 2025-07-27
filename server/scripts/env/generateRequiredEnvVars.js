import fs from "fs";
import path from "path";
import glob from "fast-glob";

const SOURCE_DIR = path.resolve(".");

/**
 * Extracts all unique environment variable keys accessed via `process.env.VAR_NAME`
 * from a given JavaScript file, ignoring comments and string literals.
 *
 * @param {string} filePath - Absolute path to the file being analyzed.
 * @returns {string[]} - Array of environment variable names found in the file.
 */
function findEnvVarsInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");

  // Remove block comments (/* ... */)
  content = content.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove single-line comments (// ...)
  content = content.replace(/\/\/.*/g, "");

  // Remove string literals ('...', "...", `...`)
  content = content.replace(/(['"`])(?:\\[\s\S]|(?!\1).)*\1/g, "");

  const matches = content.matchAll(/\bprocess\.env\.([A-Z0-9_]+)\b/g);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Scans all `.js` files in the project, collects all referenced `process.env.VAR`
 * variables, and writes them to a JS module as an array export.
 *
 * @param {string} outputPath - Path where the result JS file should be written.
 */
export function generateRequiredEnvVars(outputPath) {
  const allFiles = glob.sync(["**/*.js"], {
    cwd: SOURCE_DIR,
    ignore: ["node_modules/**", "client/**", "build/**", "dist/**", "index.js"],
    absolute: true,
  });

  const envVars = new Set();

  for (const file of allFiles) {
    try {
      const vars = findEnvVarsInFile(file);
      vars.forEach((v) => envVars.add(v));
    } catch (error) {
      console.warn(`Skipping unreadable file ${file}: ${error}`);
    }
  }

  const sortedVars = Array.from(envVars).sort();

  const jsContent = `const REQUIRED_VARS = [\n${sortedVars
    .map((v) => `  "${v}",`)
    .join("\n")}\n];\n\nexport default REQUIRED_VARS;\n`;

  fs.writeFileSync(outputPath, jsContent);
  console.log(`Wrote ${sortedVars.length} required env vars to ${outputPath}`);
  process.exit(0);
}
