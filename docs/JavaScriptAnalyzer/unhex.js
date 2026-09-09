import { parseArray } from "./parse-array.js";

const $container = /** @type {HTMLElement} */ (document.getElementById("unhex"));
const $input = /** @type {HTMLTextAreaElement} */ ($container.querySelector(":scope > textarea"));
const [$findIndexInput, $findValueInput] = $container.querySelectorAll("input");
const $output = /** @type {HTMLPreElement} */ ($container.querySelector(":scope > pre"));
const [$parseButton, $findIndexButton, $findValueButton] = $container.querySelectorAll("button");

/** @type {import("./parse-array.js").ArrayLiteralValue[]} Data from the last successful parse. */
let unHexData = [];

/** @returns {void} Parse the input as data and display its JSON representation. */
const handleParse = () => {
  unHexData = [];
  try {
    unHexData = parseArray($input.value);
    $input.value = JSON.stringify(unHexData);
    $output.textContent = "Input successfully parsed.";
  } catch (err) {
    console.log(err);
    $output.textContent = "Could not parse input.";
  }
};

$parseButton.addEventListener("click", handleParse);

/** @returns {void} Display indices and values of string entries containing the query. */
const handleFindIndex = () => {
  if (unHexData.length === 0) {
    $output.textContent = "Nothing parsed.";
    return;
  }
  let output = "";
  for (let i = 0; i < unHexData.length; i++) {
    const entry = unHexData[i];
    if (typeof entry === "string" && entry.includes($findIndexInput.value)) {
      if (output) {
        output += "\n";
      }
      output += `${i}:${entry}`;
    }
  }
  $output.textContent = output;
};

$findIndexButton.addEventListener("click", handleFindIndex);

/** @returns {void} Display the entry at the requested index, allowing negative indices. */
const handleFindValue = () => {
  if (unHexData.length === 0) {
    $output.textContent = "Nothing parsed.";
    return;
  }
  let i = parseInt($findValueInput.value);
  if (isNaN(i) || !isFinite(i)) {
    $output.textContent = "Index not valid integer.";
    return;
  }
  if (i < 0) {
    i = unHexData.length + i;
  }
  if (i < 0 || i >= unHexData.length) {
    $output.textContent = "Index out of range.";
    return;
  }
  // The DOM setter accepts data values, converting nullish values to empty text and others to strings
  /** @type {{ textContent: import("./parse-array.js").ArrayLiteralValue }} */ ($output).textContent = unHexData[i];
};

$findValueButton.addEventListener("click", handleFindValue);
