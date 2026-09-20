import { createTextTransform } from "./text-transform.js";

// Email inputs validate ASCII hostname labels, including hyphens and label lengths.
// URL parsing alone also accepts empty labels, underscores, and other invalid names.
const domainValidator = document.createElement("input");
domainValidator.type = "email";

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
      domainValidator.value = "validation@" + d;
      if (!d.includes(".") || d.length > 253 || !domainValidator.checkValidity() || !URL.canParse("https://" + d)) {
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
