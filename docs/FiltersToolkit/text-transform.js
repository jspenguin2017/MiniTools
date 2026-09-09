// Callers own the transformation logic and event listeners.
export const createTextTransform = ($container) => {
  const $input = $container.querySelector(":scope > textarea");
  const $output = $container.querySelector(":scope > pre");
  const [$transform, $copy] = $container.querySelectorAll(":scope > button");
  let output = "";

  return {
    transformButton: $transform,
    copyButton: $copy,
    getLines: () => $input.value.split("\n"),
    setOutput: (text, warnings = []) => {
      const result = [];
      if (warnings.length > 0) {
        result.push("Warnings:");
        for (const warning of warnings) {
          result.push(warning);
        }
        result.push("");
      }
      output = text;
      result.push("Output:", output);
      $output.textContent = result.join("\n");
      $copy.classList.remove("hidden");
    },
    copyOutput: () => {
      const old = $input.value;
      $input.value = output;
      $input.select();
      $input.ownerDocument.execCommand("copy");
      $input.value = old;
    },
  };
};
