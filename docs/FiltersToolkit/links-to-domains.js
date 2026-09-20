import { createTextTransform } from "./text-transform.js";

const LINK_DUPLICATE_PATTERN = /https?:.*?https?:/i;

// Locate the first link amid surrounding text; URL handles parsing its hostname
const LINK_EXTRACT_PATTERN = /https?:\/\/\S+/i;

// Keep at least two domain labels, preserving "www.com" and similar domains
const DOMAIN_CLEANUP_PATTERN = /^www?\d*?\.(?=[^.]+\.[^.]+)/;

const textTransform = createTextTransform(/** @type {HTMLElement} */ (document.getElementById("links-to-domains")));

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
    if (LINK_DUPLICATE_PATTERN.test(line)) {
      warn.push('Two links (second one ignored) "' + line + '"');
    }
    const link = LINK_EXTRACT_PATTERN.exec(line);
    if (link === null) {
      warn.push('No link "' + line + '"');
      continue;
    }
    try {
      const { hostname } = new URL(link[0]);
      out.push(hostname.replace(DOMAIN_CLEANUP_PATTERN, ""));
    } catch {
      warn.push('Invalid link "' + line + '"');
    }
  }
  textTransform.setOutput(out.sort().join(","), warn);
});

textTransform.copyButton.addEventListener("click", textTransform.copyOutput);
