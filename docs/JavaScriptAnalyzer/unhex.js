import { parseArray } from "./parse-array.js";

const $container = /** @type {HTMLElement} */ (document.getElementById("unhex"));
const $input = /** @type {HTMLTextAreaElement} */ ($container.querySelector(":scope > textarea"));
const [$findIndexInput, $findValueInput] = $container.querySelectorAll("input");
const $output = /** @type {HTMLPreElement} */ ($container.querySelector(":scope > pre"));
const $status = /** @type {HTMLElement} */ ($container.querySelector('[role="status"]'));
const $inputError = /** @type {HTMLElement} */ (document.getElementById("unhex-input-error"));
const $valueError = /** @type {HTMLElement} */ (document.getElementById("find-value-error"));
const $parseButton = /** @type {HTMLButtonElement} */ ($container.querySelector("button"));

/**
 * Clear an obsolete validation error when its field is edited or checked again.
 * @param {HTMLInputElement | HTMLTextAreaElement} $field Field being corrected.
 * @param {HTMLElement} $error Associated error description.
 */
const clearError = ($field, $error) => {
  $field.removeAttribute("aria-invalid");
  $error.textContent = "";
};

$input.addEventListener("input", () => clearError($input, $inputError));
$findValueInput.addEventListener("input", () => clearError($findValueInput, $valueError));

/** @param {string} message Short result or error message to display and announce. */
const showMessage = (message) => {
  $output.textContent = message;
  $output.hidden = false;
  $status.textContent = message;
};

/** @type {import("./parse-array.js").ArrayLiteralValue[]} Data from the last successful parse. */
let unHexData = [];

/** @returns {void} Parse the input as data and display its JSON representation. */
const handleParse = () => {
  unHexData = [];
  clearError($input, $inputError);
  clearError($findValueInput, $valueError);
  try {
    unHexData = parseArray($input.value);
    $input.value = JSON.stringify(unHexData);
    showMessage("Input successfully parsed.");
    $status.textContent = "Input successfully parsed. The array field now contains decoded JSON.";
  } catch (err) {
    console.log(err);
    showMessage("Could not parse input.");
    $input.setAttribute("aria-invalid", "true");
    $inputError.textContent =
      "Enter a complete array literal, including square brackets. Expressions are not supported.";
    $status.textContent = `Could not parse input. ${$inputError.textContent}`;
  }
};

$parseButton.addEventListener("click", handleParse);

/** @returns {void} Display indices and values of string entries containing the query. */
const handleFindIndex = () => {
  if (unHexData.length === 0) {
    showMessage("Nothing parsed.");
    $status.textContent = "Nothing parsed. Parse a nonempty array before searching.";
    return;
  }
  let output = "";
  let count = 0;
  for (let i = 0; i < unHexData.length; i++) {
    const entry = unHexData[i];
    if (typeof entry === "string" && entry.includes($findIndexInput.value)) {
      count++;
      if (output) {
        output += "\n";
      }
      output += `${i}:${entry}`;
    }
  }
  $output.textContent = output;
  $output.hidden = output.length === 0;
  $status.textContent =
    count === 0 ? "No matching string entries found." : `Matching string entries: ${count}. Results are ready below.`;
};

document.getElementById("find-index-form").addEventListener("submit", (event) => {
  event.preventDefault();
  handleFindIndex();
});

/** @returns {void} Display the entry at the requested index, allowing negative indices. */
const handleFindValue = () => {
  clearError($findValueInput, $valueError);
  if (unHexData.length === 0) {
    showMessage("Nothing parsed.");
    $status.textContent = "Nothing parsed. Parse a nonempty array before searching.";
    return;
  }
  let i = parseInt($findValueInput.value);
  if (isNaN(i) || !isFinite(i)) {
    showMessage("Index not valid integer.");
    $findValueInput.setAttribute("aria-invalid", "true");
    $valueError.textContent = "Enter an integer, for example 0 or -1.";
    $status.textContent = `Index not valid integer. ${$valueError.textContent}`;
    return;
  }
  if (i < 0) {
    i = unHexData.length + i;
  }
  if (i < 0 || i >= unHexData.length) {
    showMessage("Index out of range.");
    $findValueInput.setAttribute("aria-invalid", "true");
    $valueError.textContent = `Use an index from -${unHexData.length} to ${unHexData.length - 1}.`;
    $status.textContent = `Index out of range. ${$valueError.textContent}`;
    return;
  }
  try {
    // The DOM setter converts nullish values to empty text and other values to strings
    /** @type {{ textContent: import("./parse-array.js").ArrayLiteralValue }} */ ($output).textContent = unHexData[i];
  } catch {
    // Literal objects can shadow toString; JSON also handles arrays containing these objects
    $output.textContent = JSON.stringify(unHexData[i]);
  }
  $output.hidden = $output.textContent.length === 0;
  $status.textContent = `Value found at index ${i}. ${$output.hidden ? "The value has no text representation." : "The result is ready below."}`;
};

document.getElementById("find-value-form").addEventListener("submit", (event) => {
  event.preventDefault();
  handleFindValue();
});
