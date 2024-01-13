"use strict";

const onLoadTasks = [];

window.onload = () => {
  for (const f of onLoadTasks) {
    f();
  }
};

// UnHex
// Test data: ['\x6c\x6f\x67', '\x74\x65\x73\x74\x31\x32\x33', '\x74\x65\x73\x74\x33\x32\x31']
onLoadTasks.push(() => {
  const $container = document.getElementById("unhex");
  const $input = $container.querySelector(":scope > textarea");
  const [$findIndexInput, $findValueInput] = $container.querySelectorAll("input");
  const $output = $container.querySelector(":scope > pre");
  const [$parseButton, $findIndexButton, $findValueButton] = $container.querySelectorAll("button");

  let unHexData = [];
  const handleParse = () => {
    unHexData = [];
    try {
      eval(`unHexData = ${$input.value};`);
      $input.value = JSON.stringify(unHexData);
      $output.textContent = "Input successfully parsed.";
    } catch (err) {
      console.log(err);
      $output.textContent = "Could not parse input.";
    }
  };
  $parseButton.onclick = handleParse;

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
  $findIndexButton.onclick = handleFindIndex;

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
    $output.textContent = unHexData[i];
  };
  $findValueButton.onclick = handleFindValue;
});

// JS Unfuck
onLoadTasks.push(() => {
  const $container = document.getElementById("unfuck");
  const $input = $container.querySelector(":scope > textarea");
  const $output = $container.querySelector(":scope > pre");
  const $button = $container.querySelector(":scope > button");

  const reSpace = /\s/g;
  const handleUnfuck = () => {
    const input = $input.value.trim().replace(reSpace, "");
    try {
      if (input.endsWith("()")) {
        const result = eval(input.slice(0, -2));
        $output.textContent = `(${result})()`;
      } else {
        $output.textContent = eval(input);
      }
    } catch (err) {
      $output.textContent = "Failed, maybe the other method will work?\n";
      $output.textContent += "Error message:\n";
      $output.textContent += err;
    }
  };
  $button.onclick = handleUnfuck;
});
