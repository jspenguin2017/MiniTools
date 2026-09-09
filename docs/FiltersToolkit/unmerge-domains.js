import { createTextTransform } from "./text-transform.js";

const textTransform = createTextTransform(/** @type {HTMLElement} */ (document.getElementById("unmerge-domains")));

textTransform.transformButton.addEventListener("click", () => {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const warn = [];
  /** @type {Map<string, number>} Remaining occurrences, so each match removes only one duplicate. */
  const remaining = new Map();
  let count = 0;
  for (let line of textTransform.getLines()) {
    line = line.trim();
    if (line.length === 0) {
      continue;
    }
    count++;
    for (let d of line.split(",")) {
      d = d.trim();
      const occurrences = remaining.get(d) ?? 0;
      if (count === 1) {
        remaining.set(d, occurrences + 1);
        continue;
      }
      if (occurrences === 0) {
        warn.push('No entry "' + d + '"');
        continue;
      }
      remaining.set(d, occurrences - 1);
    }
  }
  if (count === 1) {
    warn.push("Only one array found!");
  }
  for (const [d, occurrences] of remaining) {
    for (let i = 0; i < occurrences; i++) out.push(d);
  }
  textTransform.setOutput(out.sort().join(","), warn);
});

textTransform.copyButton.addEventListener("click", textTransform.copyOutput);
