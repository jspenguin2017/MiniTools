import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SourceTextModule } from "node:vm";
import { JSDOM, VirtualConsole } from "jsdom";

// Load the real markup and its modules in an isolated window for every test.
// Give modules their real filenames so Node attributes coverage to docs/.
export async function loadPage(context, name) {
  const filename = path.resolve(import.meta.dirname, "../../docs", name, "index.html");
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
  const modules = new Map();
  const loadModule = (moduleFilename) => {
    if (!modules.has(moduleFilename)) {
      modules.set(
        moduleFilename,
        new SourceTextModule(readFileSync(moduleFilename, "utf8"), {
          identifier: moduleFilename,
          context: dom.getInternalVMContext(),
        }),
      );
    }
    return modules.get(moduleFilename);
  };
  for (const element of dom.window.document.querySelectorAll("script[src]")) {
    assert.equal(element.type, "module");
    const module = loadModule(fileURLToPath(element.src));
    if (module.status === "unlinked") {
      await module.link((specifier, referencingModule) =>
        loadModule(fileURLToPath(new URL(specifier, pathToFileURL(referencingModule.identifier)))),
      );
    }
    await module.evaluate();
  }
  await loaded;
  return dom.window;
}
