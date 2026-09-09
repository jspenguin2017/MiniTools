import { createTextTransform } from "./text-transform.js";

const textTransform = createTextTransform(/** @type {HTMLElement} */ (document.getElementById("unmerge-domains")));

// TODO: Quadratic running time, can this be optimized?
textTransform.transformButton.addEventListener("click", () => {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const warn = [];
  let count = 0;
  /** @type {string[] | null} Null until the first nonblank line supplies the entries to subtract from. */
  let arr = null;
  for (let line of textTransform.getLines()) {
    line = line.trim();
    if (line.length === 0) {
      continue;
    }
    count++;
    if (arr === null) {
      arr = line.split(",");
      arr = arr.map((x) => x.trim());
      continue;
    }
    for (let d of line.split(",")) {
      d = d.trim();
      const index = arr.indexOf(d);
      if (index === -1) {
        warn.push('No entry "' + d + '"');
        continue;
      }
      arr.splice(index, 1);
    }
  }
  if (count === 1) {
    warn.push("Only one array found!");
  }
  if (count > 0) {
    // A nonzero count means the first array has been read
    for (const d of /** @type {string[]} */ (arr)) out.push(d);
  }
  textTransform.setOutput(out.sort().join(","), warn);
});

textTransform.copyButton.addEventListener("click", textTransform.copyOutput);
