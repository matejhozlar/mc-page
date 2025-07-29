import fs from "fs/promises";
import path from "path";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const [, , srcFileName, cssFileName] = process.argv;

if (!srcFileName || !cssFileName) {
  console.error("Usage: node extract-css.mjs <Component.jsx> <CssFile>");
  process.exit(1);
}

const COMPONENTS_DIR = "./src/components";
const INDEX_CSS = "./src/index.css";
const OUTPUT_DIR = path.join(COMPONENTS_DIR, "css");
const OUTPUT_CSS_PATH = path.join(OUTPUT_DIR, `${cssFileName}.css`);

const BOOTSTRAP_CLASSES = [
  "btn",
  "alert",
  "card",
  "container",
  "row",
  "col",
  "form-control",
  "d-flex",
  "d-block",
  "mb-2",
  "mt-3",
  "btn-primary",
  "btn-outline",
  "text-danger",
  "text-light",
];

const extractClassNames = (content) => {
  const classRegex = /className\s*=\s*(?:"([^"]+)"|'([^']+)'|{`([^`}]+)`})/g;
  const classNames = new Set();

  let match;
  while ((match = classRegex.exec(content))) {
    const raw = match[1] || match[2] || match[3];
    raw.split(/\s+/).forEach((cls) => {
      if (
        cls &&
        !BOOTSTRAP_CLASSES.some((bs) => cls.startsWith(bs)) &&
        !cls.startsWith("btn")
      ) {
        classNames.add(cls);
      }
    });
  }

  return Array.from(classNames);
};

const selectorMatches = (selector, classNames) => {
  let allClasses = [];

  selectorParser((selectors) => {
    selectors.walkClasses((node) => {
      allClasses.push(node.value);
    });
  }).processSync(selector);

  return (
    allClasses.length > 0 && allClasses.every((cls) => classNames.includes(cls))
  );
};

const extractMatchingRules = (cssAst, classNames) => {
  const results = [];
  const seen = new Map(); // key: selector, value: rule.toString()

  const matchesSelector = (selector) => {
    let classes = [];

    selectorParser((selectors) => {
      selectors.walkClasses((cls) => {
        classes.push(cls.value);
      });
    }).processSync(selector);

    return (
      classes.length > 0 && classes.every((cls) => classNames.includes(cls))
    );
  };

  cssAst.walk((node) => {
    if (
      node.type === "rule" &&
      node.selector &&
      matchesSelector(node.selector)
    ) {
      const selector = node.selector.trim();
      const body = node.toString().trim();

      if (!seen.has(selector)) {
        seen.set(selector, body);
        results.push(node.clone());
      } else {
        const prevBody = seen.get(selector);
        if (prevBody !== body) {
          results.push(node.clone());
        }
      }
    }

    if (node.type === "atrule" && node.name === "media") {
      const mediaAtRule = node.clone({ nodes: [] });

      node.walkRules((rule) => {
        if (rule.selector && matchesSelector(rule.selector)) {
          const selector = rule.selector.trim();
          const body = rule.toString().trim();

          if (!seen.has(selector)) {
            seen.set(selector, body);
            mediaAtRule.append(rule.clone());
          } else {
            const prevBody = seen.get(selector);
            if (prevBody !== body) {
              mediaAtRule.append(rule.clone());
            }
          }
        }
      });

      if (mediaAtRule.nodes.length > 0) {
        results.push(mediaAtRule);
      }
    }
  });

  return results;
};

const main = async () => {
  try {
    const srcPath = path.join(COMPONENTS_DIR, srcFileName);
    console.log("📄 Reading file:", srcPath);
    const componentCode = await fs.readFile(srcPath, "utf-8");
    const classNames = extractClassNames(componentCode);

    const cssText = await fs.readFile(INDEX_CSS, "utf-8");
    const cssAst = postcss.parse(cssText);

    const matchingRules = extractMatchingRules(cssAst, classNames);

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(
      OUTPUT_CSS_PATH,
      matchingRules.map((n) => n.toString()).join("\n\n"),
      "utf-8"
    );

    console.log(
      `✅ Extracted ${matchingRules.length} rule(s) to ${OUTPUT_CSS_PATH}`
    );
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
};

main();
