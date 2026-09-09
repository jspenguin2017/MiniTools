import { createTextTransform } from "./text-transform.js";

const textTransform = createTextTransform(/** @type {HTMLElement} */ (document.getElementById("links-to-domains")));
const reDomainExtract = /https?:\/\/([^:/?#\s]+)/; // There can be extra text before the link, so no start anchor
const reDomainDuplicate = /https?:.*?https?:/;
const reDomainCleanup = /^www?\d*?\./; // TODO: What about "www.com" or similar domains?

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
