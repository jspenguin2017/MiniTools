import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SourceTextModule } from "node:vm";
import { JSDOM, VirtualConsole } from "jsdom";

/**
 * Load the real markup and modules in an isolated window, closed after the test.
 * Give modules their real filenames so Node attributes coverage to docs/.
 * @param {import("node:test").TestContext} context Test context that owns cleanup and error assertions.
 * @param {"FiltersToolkit" | "JavaScriptAnalyzer"} name Page directory under docs/.
 * @returns {Promise<import("jsdom").DOMWindow>} Window after its load event and module evaluation.
 */
export async function loadPage(context, name) {
  const filename = path.resolve(import.meta.dirname, "../../docs", name, "index.html");
  /** @type {Error[]} */
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

  /** @type {Promise<Event>} */
  const loaded = new Promise((resolve) => dom.window.addEventListener("load", resolve, { once: true }));
  /** @type {Map<string, SourceTextModule>} */
  const modules = new Map();
  /**
   * @param {string} moduleFilename Absolute path used as the module identifier and cache key.
   * @returns {SourceTextModule} Cached or newly compiled module in this page's VM context.
   */
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
    return /** @type {SourceTextModule} */ (modules.get(moduleFilename));
  };
  for (const element of /** @type {NodeListOf<HTMLScriptElement>} */ (
    dom.window.document.querySelectorAll("script[src]")
  )) {
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
