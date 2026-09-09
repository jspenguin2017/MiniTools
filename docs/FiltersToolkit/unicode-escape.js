import { createTextTransform } from "./text-transform.js";

const textTransform = createTextTransform(/** @type {HTMLElement} */ (document.getElementById("unicode-escape")));

textTransform.transformButton.addEventListener("click", () => {
  /** @type {string[]} */
  const out = [];
  for (const line of textTransform.getLines()) {
    const chars = line.split("");
    for (let i = 0; i < chars.length; i++) {
      const code = chars[i].charCodeAt(0);
      if (code > 0x7f) {
        chars[i] = "\\u" + code.toString(16).padStart(4, "0").toUpperCase();
      }
    }
    out.push(chars.join(""));
  }
  textTransform.setOutput(out.join("\n"));
});

textTransform.copyButton.addEventListener("click", textTransform.copyOutput);
