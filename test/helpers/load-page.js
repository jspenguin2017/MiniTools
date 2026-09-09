import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { onTestFinished, vi } from "vitest";

/**
 * Load the real markup in Vitest's jsdom window and import its modules through Vitest.
 * Reset the document and module cache so each test gets fresh controls and module state.
 * @param {"FiltersToolkit" | "JavaScriptAnalyzer"} name Page directory under docs/.
 * @returns {Promise<Window & typeof globalThis>} Window after the page's modules have initialized.
 */
export async function loadPage(name) {
  const pageURL = new URL(`../../docs/${name}/index.html`, import.meta.url);
  vi.resetModules();
  const { default: html } = await import(`../../docs/${name}/index.html?raw`);
  const page = new DOMParser().parseFromString(html, "text/html");
  document.replaceChild(document.importNode(page.documentElement, true), document.documentElement);
  onTestFinished(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  // jsdom does not execute module scripts; let Vitest load and track them for coverage
  for (const element of /** @type {NodeListOf<HTMLScriptElement>} */ (document.querySelectorAll("script[src]"))) {
    assert.equal(element.type, "module");
    const moduleFilename = fileURLToPath(new URL(element.getAttribute("src"), pageURL));
    await import(moduleFilename);
  }
  return window;
}
