import { createTextTransform } from "./text-transform.js";

// Repeated prefixes may indicate multiple links or appear within a single URL
const MULTIPLE_LINK_PREFIXES_PATTERN = /https?:.*?https?:/i;

// Take the first link candidate through the next whitespace; URL validates it
const FIRST_LINK_CANDIDATE_PATTERN = /https?:\/\/\S+/i;

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
    if (MULTIPLE_LINK_PREFIXES_PATTERN.test(line)) {
      warn.push('Multiple HTTP(S) prefixes (only the first link candidate is parsed) "' + line + '"');
    }
    const firstLinkCandidate = FIRST_LINK_CANDIDATE_PATTERN.exec(line);
    if (firstLinkCandidate === null) {
      warn.push('No link "' + line + '"');
      continue;
    }
    try {
      const { hostname } = new URL(firstLinkCandidate[0]);
      out.push(hostname.replace(DOMAIN_CLEANUP_PATTERN, ""));
    } catch {
      warn.push('Invalid link "' + line + '"');
    }
  }
  textTransform.setOutput(out.sort().join(","), warn);
});

textTransform.copyButton.addEventListener("click", textTransform.copyOutput);
