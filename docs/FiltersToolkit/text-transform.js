/**
 * Controls and output buffer for a text transformation.
 * @typedef {object} TextTransform
 * @property {HTMLButtonElement} transformButton Button that runs the caller's transformation.
 * @property {HTMLButtonElement} copyButton Button that copies the latest output.
 * @property {() => string[]} getLines Read the input as newline-separated lines.
 * @property {(text: string, warnings?: string[]) => void} setOutput Display output and optional warnings.
 * @property {() => Promise<void>} copyOutput Copy only the output, preserving the current input.
 */

/**
 * Bind a tool's controls. Callers own the transformation logic and event listeners.
 * @param {HTMLElement} $container Container with a direct textarea, pre, status, and transform/copy buttons in that order.
 * @returns {TextTransform} Controls and operations for this container.
 */
export const createTextTransform = ($container) => {
  const $input = /** @type {HTMLTextAreaElement} */ ($container.querySelector(":scope > textarea"));
  const $output = /** @type {HTMLPreElement} */ ($container.querySelector(":scope > pre"));
  const $status = /** @type {HTMLElement} */ ($container.querySelector(':scope > [role="status"]'));
  const [$transform, $copy] = /** @type {NodeListOf<HTMLButtonElement>} */ (
    $container.querySelectorAll(":scope > button")
  );
  let output = "";
  return {
    transformButton: $transform,
    copyButton: $copy,
    getLines: () => {
      return $input.value.split("\n");
    },
    setOutput: (text, warnings = []) => {
      /** @type {string[]} */
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
      $output.hidden = false;
      $copy.classList.remove("hidden");
      $status.textContent = `Transformation complete. Warnings: ${warnings.length}. ${text.length === 0 ? "Output is empty." : "Output is ready below."}`;
    },
    copyOutput: async () => {
      $status.textContent = "Copying output…";
      try {
        await navigator.clipboard.writeText(output);
        $status.textContent = "Output copied to clipboard.";
      } catch {
        $status.textContent = "Could not copy output. Select the output below and copy it manually.";
      }
    },
  };
};
