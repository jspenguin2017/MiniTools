import { createTextTransform } from "./text-transform.js";
import { isValidDomain } from "./validate-domain.js";

const textTransform = createTextTransform(/** @type {HTMLElement} */ (document.getElementById("merge-domains")));

textTransform.transformButton.addEventListener("click", () => {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const warn = [];
  /** @type {Set<string>} */
  const set = new Set();
  let count = 0;
  for (let line of textTransform.getLines()) {
    line = line.trim();
    if (line.length === 0) {
      continue;
    }
    count++;
    for (let d of line.split(",")) {
      d = d.trim();
      if (!isValidDomain(d)) {
        warn.push('Invalid entry "' + d + '"');
        continue;
      }
      if (set.has(d)) {
        warn.push('Duplicate entry "' + d + '"');
        continue;
      }
      set.add(d);
      out.push(d);
    }
  }
  if (count === 1) {
    warn.push("Only one array found!");
  }
  textTransform.setOutput(out.sort().join(","), warn);
});

textTransform.copyButton.addEventListener("click", textTransform.copyOutput);
