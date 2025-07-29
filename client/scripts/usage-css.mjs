import fs from "fs/promises";
import path from "path";

const [, , classNameArg] = process.argv;

if (!classNameArg) {
  console.error("❌ Usage: node check-class-usage.mjs <class-name>");
  process.exit(1);
}

const COMPONENT_DIRS = ["./src/components", "./src/components/clickerGame"];

const CLASS_NAME = classNameArg.trim();
const results = [];

const extractExactMatches = (content) => {
  const classNames = new Set();

  // Match className="..." or className='...'
  const simpleRegex = /className\s*=\s*(?:"([^"]+)"|'([^']+)')/g;
  let match;
  while ((match = simpleRegex.exec(content))) {
    const raw = match[1] || match[2];
    raw.split(/\s+/).forEach((cls) => classNames.add(cls));
  }

  // Match className={`...`} with possible interpolations
  const backtickRegex = /className\s*=\s*{`([^`]*)`}/g;
  while ((match = backtickRegex.exec(content))) {
    const raw = match[1].replace(/\${[^}]+}/g, ""); // remove interpolations
    raw.split(/\s+/).forEach((cls) => classNames.add(cls));
  }

  return classNames.has(CLASS_NAME);
};

const scanDirectory = async (dir) => {
  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (file.endsWith(".jsx") || file.endsWith(".tsx")) {
        const content = await fs.readFile(fullPath, "utf-8");
        if (extractExactMatches(content)) {
          results.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`❌ Failed to read directory ${dir}:`, err.message);
  }
};

const main = async () => {
  for (const dir of COMPONENT_DIRS) {
    await scanDirectory(dir);
  }

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
