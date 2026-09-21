import { loadPage } from "./load-page.js";

/**
 * Find the controls for one Filters Toolkit container.
 * @param {Window & typeof globalThis} window Loaded test window.
 * @param {string} id Tool container ID in the page markup.
 */
export function controls(window, id) {
  const container = /** @type {HTMLElement} */ (window.document.getElementById(id));
  const [transform, copy] = container.querySelectorAll("button");
  return {
    window,
    input: /** @type {HTMLTextAreaElement} */ (container.querySelector("textarea")),
    output: /** @type {HTMLPreElement} */ (container.querySelector("pre")),
    status: /** @type {HTMLElement} */ (container.querySelector('[role="status"]')),
    transform,
    copy,
  };
}

/**
 * Load a transformation's real markup and initialize only its owning module.
 * @param {string} id Tool container ID and source basename.
 */
export async function loadTransform(id) {
  return controls(await loadPage("FiltersToolkit", `${id}.js`), id);
}
