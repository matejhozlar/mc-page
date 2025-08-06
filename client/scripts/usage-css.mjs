import fs from "fs/promises";
import path from "path";

const [, , classNameArg] = process.argv;

if (!classNameArg) {
  console.error("❌ Usage: node check-class-usage.mjs <class-name>");
  process.exit(1);
}

const CLASS_NAME = classNameArg.trim();
const results = [];

/**
 * Extracts classNames from JSX content and checks if CLASS_NAME is used.
 */
const extractExactMatches = (content) => {
  const classNames = new Set();

  const simpleRegex = /className\s*=\s*(?:"([^"]+)"|'([^']+)')/g;
  let match;
  while ((match = simpleRegex.exec(content))) {
    const raw = match[1] || match[2];
    raw.split(/\s+/).forEach((cls) => classNames.add(cls));
  }

  const backtickRegex = /className\s*=\s*{`([^`]*)`}/g;
  while ((match = backtickRegex.exec(content))) {
    const raw = match[1].replace(/\${[^}]+}/g, "");
    raw.split(/\s+/).forEach((cls) => classNames.add(cls));
  }

  return classNames.has(CLASS_NAME);
};

/**
 * Recursively scans directories for .jsx and .tsx files.
 */
const scanDirectory = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await scanDirectory(fullPath); // recurse into subdirectory
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".jsx") || entry.name.endsWith(".tsx"))
    ) {
      const content = await fs.readFile(fullPath, "utf-8");
      if (extractExactMatches(content)) {
        results.push(fullPath);
      }
    }
  }
};

const main = async () => {
  await scanDirectory("./src");

  if (results.length === 0) {
    console.log(`🔍 Class "${CLASS_NAME}" was not found in any component.`);
  } else {
    console.log(
      `✅ Class "${CLASS_NAME}" was found in ${results.length} file(s):`
    );
    results.forEach((file) => console.log("  -", file));
    if (results.length > 1) {
      console.log(
        `\n⚠️ This class is used in multiple components — it's likely global.`
      );
    }
  }
};

main();
