import fs from "fs/promises";
import path from "path";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const [, , cssFileName] = process.argv;

if (!cssFileName) {
  console.error("Usage: node cleanup-css.mjs <CssFileNameWithoutExtension>");
  process.exit(1);
}

const COMPONENT_CSS_PATH = path.join(
  "src",
  "components",
  "css",
  `${cssFileName}.css`
);
const INDEX_CSS_PATH = path.join("src", "index.css");

// Extract all .className used in the component's CSS file
const extractClassNamesFromCss = (cssText) => {
  const classRegex = /\.([a-zA-Z0-9_-]+)\b/g;
  const classNames = new Set();

  let match;
  while ((match = classRegex.exec(cssText))) {
    classNames.add(match[1]);
  }

  return Array.from(classNames);
};

// Only match selectors that are pure class selectors, and only if all classes match
const selectorMatches = (selector, classNames) => {
  let matchedAll = true;
  let hasClass = false;

  selectorParser((selectors) => {
    selectors.each((sel) => {
      sel.walk((node) => {
        if (node.type === "class") {
          hasClass = true;
          if (!classNames.includes(node.value)) {
            matchedAll = false;
          }
        } else if (
          node.type === "tag" ||
          node.type === "universal" ||
          node.type === "pseudo" ||
          node.type === "id"
        ) {
          // If any non-class node exists in the selector, ignore this rule
          matchedAll = false;
        }
      });
    });
  }).processSync(selector);

  return hasClass && matchedAll;
};

// Remove class-matching rules from the CSS AST
const cleanCssAst = (cssAst, classNames) => {
  cssAst.walk((node) => {
    if (node.type === "rule") {
      if (selectorMatches(node.selector, classNames)) {
        node.remove();
      }
    }

    if (node.type === "atrule" && node.name === "media") {
      node.walkRules((rule) => {
        if (selectorMatches(rule.selector, classNames)) {
          rule.remove();
        }
      });

      // Remove @media if it's empty
      if (node.nodes.length === 0) {
        node.remove();
      }
    }
  });

  return cssAst;
};

const main = async () => {
  try {
    const componentCss = await fs.readFile(COMPONENT_CSS_PATH, "utf-8");
    const indexCss = await fs.readFile(INDEX_CSS_PATH, "utf-8");

    const classNames = extractClassNamesFromCss(componentCss);
    const cssAst = postcss.parse(indexCss);
    const cleanedAst = cleanCssAst(cssAst, classNames);

    await fs.writeFile(INDEX_CSS_PATH, cleanedAst.toString(), "utf-8");

    console.log(`✅ Removed ${classNames.length} class(es) from index.css`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
};

main();
