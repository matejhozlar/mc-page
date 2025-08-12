import fs from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import purgePkg from "@fullhuman/postcss-purgecss";
import discardDuplicates from "postcss-discard-duplicates";
import mergeRules from "postcss-merge-rules";
import cssnano from "cssnano";
import { globby } from "globby";

const purgecss = purgePkg?.purgeCSSPlugin || purgePkg?.default || purgePkg;

const inputCss = "src/index.css";
const outputCss = "dist/cleaned.css";

const contentGlobs = [
  "**/*.html",
  "src/**/*.{js,jsx,ts,tsx,vue,svelte}",
  "public/**/*.html",
];

const safelist = ["is-active", "hidden", /^modal-/, /^is-/];

const defaultExtractor = (content) => content.match(/[\w-/:]+(?<!:)/g) || [];

(async () => {
  const contentFiles = await globby(contentGlobs, { gitignore: true });
  const cssIn = await fs.readFile(inputCss, "utf8");

  const result = await postcss([
    purgecss({
      content: contentFiles,
      safelist,
      defaultExtractor,
    }),
    discardDuplicates(),
    mergeRules(),
    cssnano(),
  ]).process(cssIn, { from: inputCss, to: outputCss });

  await fs.mkdir(path.dirname(outputCss), { recursive: true });
  await fs.writeFile(outputCss, result.css, "utf8");

  console.log(
    `✅ Wrote ${outputCss} (from ${cssIn.length} → ${result.css.length} bytes)`
  );
})();
