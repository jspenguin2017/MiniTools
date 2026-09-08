"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { Script } = require("node:vm");
const { JSDOM, VirtualConsole } = require("jsdom");

// Load the real markup and its scripts in an isolated window for every test.
// Give scripts their real filenames so Node attributes coverage to docs/.
async function loadPage(context, name) {
  const filename = path.resolve(__dirname, "../../docs", name, "index.html");
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  const dom = new JSDOM(readFileSync(filename, "utf8"), {
    url: pathToFileURL(filename).href,
    runScripts: "outside-only",
    virtualConsole,
  });
  context.after(() => {
    dom.window.close();
    assert.deepEqual(errors, [], "Page events must not throw unhandled errors");
  });

  const loaded = new Promise((resolve) => dom.window.addEventListener("load", resolve, { once: true }));
  for (const element of dom.window.document.querySelectorAll("script[src]")) {
    const scriptFilename = fileURLToPath(element.src);
    new Script(readFileSync(scriptFilename, "utf8"), { filename: scriptFilename }).runInContext(
      dom.getInternalVMContext(),
    );
  }
  await loaded;
  return dom.window;
}

module.exports = { loadPage };
