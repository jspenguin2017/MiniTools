import { createTextTransform } from "./text-transform.js";

const textTransform = createTextTransform(document.getElementById("unmerge-domains"));

// TODO: Quadratic running time, can this be optimized?
textTransform.transformButton.addEventListener("click", () => {
  const out = [];
  const warn = [];
  let count = 0;
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
    for (const d of arr) out.push(d);
  }
  textTransform.setOutput(out.sort().join(","), warn);
});

textTransform.copyButton.addEventListener("click", textTransform.copyOutput);
