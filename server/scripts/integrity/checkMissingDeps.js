import fs from "fs";
import path from "path";
import glob from "fast-glob";
import module from "module";

/**
 * @fileoverview Checks for:
 * - Missing dependencies (used but not in package.json)
 * - Unused dependencies (in package.json but not used)
 */

const ROOT = path.resolve(".");
const PKG_PATH = path.join(ROOT, "package.json");
const BUILTIN_MODULES = new Set(module.builtinModules);

const IGNORE_DIRS = ["node_modules", "dist", "build", ".git", "client"];
const EXTENSIONS = ["js", "ts", "cjs", "mjs"];
const pattern = `**/*.{${EXTENSIONS.join(",")}}`;

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
const declaredDeps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]);

const files = glob.sync(pattern, {
  cwd: ROOT,
  ignore: IGNORE_DIRS.map((d) => `${d}/**`),
  absolute: true,
});

const usedDeps = new Set();
const importRegex =
  /(?:import\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\))/g;

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  let match;
  while ((match = importRegex.exec(content))) {
    const raw = match[1] || match[2];
    if (!raw || raw.startsWith(".") || raw.startsWith("/")) continue; // skip relative imports
    const base = raw.startsWith("@")
      ? raw.split("/").slice(0, 2).join("/")
      : raw.split("/")[0];
    if (!BUILTIN_MODULES.has(base)) {
      usedDeps.add(base);
    }
  }
}

const missing = [...usedDeps].filter((d) => !declaredDeps.has(d));
const IGNORED_UNUSED = new Set([...module.builtinModules, "url", "path"]);

const unused = [...declaredDeps].filter(
  (d) => !usedDeps.has(d) && !IGNORED_UNUSED.has(d)
);

if (missing.length > 0) {
  console.log(
    "❌ Missing dependencies (used in code but not in package.json):"
  );
  missing.forEach((d) => console.log(`- ${d}`));
  console.log("");
} else {
  console.log("✅ No missing dependencies.");
}

if (unused.length > 0) {
  console.log("⚠️  Unused dependencies (declared but not used in code):");
  unused.forEach((d) => console.log(`- ${d}`));
  console.log("");
} else {
  console.log("✅ No unused dependencies.");
}
