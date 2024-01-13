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
  const [$method1Button, $method2Button] = $container.querySelectorAll("button");

  const reSpace = /\s/g;
  const reMethod1 = /\n(.+)/;
  const reMethod2 = /.+(?=\n})/;
  const handle = (re) => {
    const input = $input.value.trim().replace(reSpace, "");
    try {
      if (input.endsWith("()")) {
        // Remove outmost eval() wrapper
        const result = eval(input.slice(0, -2));
        $output.value = re.exec(result)[1].toString();
      } else {
        $output.value = eval(input).toString();
      }
    } catch (err) {
      $output.value = "Failed, maybe the other method will work?\n";
      $output.value += "Error message:\n";
      $output.value += err;
    }
  };
  $method1Button.onclick = () => {
    handle(reMethod1);
  };
  $method2Button.onclick = () => {
    handle(reMethod2);
  };
});
