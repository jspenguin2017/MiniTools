import { createTextTransform } from "./text-transform.js";

const textTransform = createTextTransform(/** @type {HTMLElement} */ (document.getElementById("links-to-domains")));

const reDomainDuplicate = /https?:.*?https?:/;

// There can be extra text before the link, so no start anchor
const reDomainExtract = /https?:\/\/([^:/?#\s]+)/;

// Keep at least two domain labels, preserving "www.com" and similar domains
const reDomainCleanup = /^www?\d*?\.(?=[^.]+\.[^.]+)/;

textTransform.transformButton.addEventListener("click", () => {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const warn = [];
  for (let line of textTransform.getLines()) {
    line = line.trim();
    if (line.length === 0) {
      continue;
    }
    if (reDomainDuplicate.test(line)) {
      warn.push('Two links (second one ignored) "' + line + '"');
    }
    const dom = reDomainExtract.exec(line);
    if (dom === null) {
      warn.push('No link "' + line + '"');
      continue;
    }
    out.push(dom[1].replace(reDomainCleanup, ""));
  }
  textTransform.setOutput(out.sort().join(","), warn);
});

textTransform.copyButton.addEventListener("click", textTransform.copyOutput);
