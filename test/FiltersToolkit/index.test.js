import assert from "node:assert/strict";
import { it, vi } from "vitest";
import { loadPage } from "../helpers/load-page.js";
import { controls } from "../helpers/transform-controls.js";

it("keeps the page's transforms and copy buffers independent", async () => {
  const window = await loadPage("FiltersToolkit");
  const tools = [
    {
      id: "links-to-domains",
      input: "https://b.example\nhttps://a.example",
      output: "a.example,b.example",
    },
    {
      id: "merge-domains",
      input: "c.example\nd.example",
      output: "c.example,d.example",
    },
    {
      id: "unmerge-domains",
      input: "e.example,f.example\nf.example",
      output: "e.example",
    },
    {
      id: "unicode-escape",
      input: "é",
      output: "\\u00E9",
    },
  ].map((example) => ({ ...controls(window, example.id), example }));
  const writeText = vi.fn(async (/** @type {string} */ _text) => {});
  vi.stubGlobal("navigator", { clipboard: { writeText } });

  for (const tool of tools) {
    tool.input.value = tool.example.input;
    tool.transform.click();
  }
  /** @type {string[][]} */
  const expectedCalls = [];
  const copied = new Set();
  for (const tool of tools.toReversed()) {
    tool.copy.click();
    await vi.waitFor(() => assert.equal(tool.status.textContent, "Output copied to clipboard."));
    expectedCalls.push([tool.example.output]);
    copied.add(tool);
    assert.deepEqual(writeText.mock.calls, expectedCalls);
    for (const other of tools) {
      assert.equal(other.output.textContent, "Output:\n" + other.example.output);
      assert.equal(other.output.hidden, false);
      assert.equal(other.input.value, other.example.input);
      assert.equal(
        other.status.textContent,
        copied.has(other)
          ? "Output copied to clipboard."
          : "Transformation complete. Warnings: 0. Output is ready below.",
      );
    }
  }
});
