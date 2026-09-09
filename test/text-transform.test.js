import assert from "node:assert/strict";
import { describe, it, onTestFinished, vi } from "vitest";
import { createTextTransform } from "../docs/FiltersToolkit/text-transform.js";

/**
 * Exercise the shared transform API directly so clipboard promises can be awaited.
 */
function transform() {
  document.body.innerHTML = `
    <section>
      <div><textarea>nested input</textarea><pre>nested output</pre><button>Nested</button></div>
      <textarea></textarea><pre></pre>
      <button>Transform</button><button class="green hidden">Copy Output</button>
    </section>
  `;
  onTestFinished(() => document.body.replaceChildren());
  const container = /** @type {HTMLElement} */ (document.querySelector("section"));
  const input = /** @type {HTMLTextAreaElement} */ (container.querySelector(":scope > textarea"));
  const output = /** @type {HTMLPreElement} */ (container.querySelector(":scope > pre"));
  const writeText = vi.fn(async (/** @type {string} */ _text) => {});
  const clipboard = { writeText };
  vi.stubGlobal("navigator", { clipboard });
  return { ...createTextTransform(container), window, container, input, output, writeText };
}

describe("shared text transform", () => {
  it("binds direct controls and leaves nested controls alone", () => {
    const tool = transform();
    assert.equal(tool.transformButton.textContent, "Transform");
    assert.equal(tool.copyButton.textContent, "Copy Output");
    tool.input.value = "direct input";
    assert.deepEqual(tool.getLines(), ["direct input"]);
    tool.setOutput("direct output");
    assert.equal(tool.output.textContent, "Output:\ndirect output");
    assert.equal(tool.copyButton.className, "green");
    assert.equal(
      /** @type {HTMLTextAreaElement} */ (tool.container.querySelector("div textarea")).value,
      "nested input",
    );
    assert.equal(tool.container.querySelector("div pre").textContent, "nested output");
  });

  it("reads current input without trimming or dropping empty lines", () => {
    const tool = transform();
    assert.deepEqual(tool.getLines(), [""]);
    tool.input.value = "\n first \r\n\r\tlast\n";
    assert.deepEqual(tool.getLines(), ["", " first ", "", "\tlast", ""]);
    const lines = tool.getLines();
    lines[1] = "changed";
    assert.equal(tool.input.value, "\n first \n\n\tlast\n");
    tool.input.value = "replacement";
    assert.deepEqual(tool.getLines(), ["replacement"]);
  });

  it("renders literal warnings and output, replaces old warnings, and copies only the output", async () => {
    const tool = transform();
    const warnings = ["<b>first</b>", "Output:\nsecond"];
    const text = "Output:\nWarnings:\n<b>literal output</b>\n";
    tool.setOutput(text, warnings);
    assert.equal(tool.output.textContent, "Warnings:\n<b>first</b>\nOutput:\nsecond\n\nOutput:\n" + text);
    assert.equal(tool.output.children.length, 0);
    assert.deepEqual(warnings, ["<b>first</b>", "Output:\nsecond"]);
    await tool.copyOutput();
    assert.deepEqual(tool.writeText.mock.calls[0], [text]);
    assert.equal(tool.writeText.mock.contexts[0], navigator.clipboard);

    tool.setOutput("replacement", []);
    assert.equal(tool.output.textContent, "Output:\nreplacement");
    tool.setOutput("");
    assert.equal(tool.output.textContent, "Output:\n");
    await tool.copyOutput();
    assert.deepEqual(tool.writeText.mock.calls[1], [""]);
    assert.equal(tool.writeText.mock.calls.length, 2);
  });

  it("copies an empty initial buffer without changing the initial display", async () => {
    const tool = transform();
    await tool.copyOutput();
    assert.deepEqual(tool.writeText.mock.calls[0], [""]);
    assert.equal(tool.output.textContent, "");
    assert.equal(tool.copyButton.classList.contains("hidden"), true);
  });

  it("waits for the clipboard and captures the output at the time of each copy", async () => {
    const tool = transform();
    /** @type {PromiseWithResolvers<void>} */
    const firstWrite = Promise.withResolvers();
    tool.writeText.mockImplementationOnce(() => firstWrite.promise);
    tool.input.value = "untransformed input";
    tool.input.focus();
    tool.input.setSelectionRange(2, 7, "backward");
    tool.setOutput("first");
    let settled = false;
    const firstCopy = tool.copyOutput().then(() => {
      settled = true;
    });
    await Promise.resolve();
    assert.equal(settled, false);

    tool.setOutput("second", ["new warning"]);
    await tool.copyOutput();
    assert.equal(settled, false);
    assert.deepEqual(tool.writeText.mock.calls, [["first"], ["second"]]);
    firstWrite.resolve();
    await firstCopy;
    assert.equal(settled, true);
    assert.equal(tool.output.textContent, "Warnings:\nnew warning\n\nOutput:\nsecond");
    assert.equal(tool.input.value, "untransformed input");
    assert.equal(tool.window.document.activeElement, tool.input);
    assert.equal(tool.input.selectionStart, 2);
    assert.equal(tool.input.selectionEnd, 7);
    assert.equal(tool.input.selectionDirection, "backward");
  });

  for (const synchronous of [false, true]) {
    it(`propagates a clipboard ${synchronous ? "exception" : "rejection"} and allows retry`, async () => {
      const tool = transform();
      const failure = new DOMException("Clipboard permission denied", "NotAllowedError");
      tool.writeText.mockImplementationOnce(() => {
        if (synchronous) throw failure;
        return Promise.reject(failure);
      });
      tool.input.value = "current input";
      tool.setOutput("result", ["warning"]);
      await assert.rejects(tool.copyOutput(), (error) => error === failure);
      assert.equal(tool.input.value, "current input");
      assert.equal(tool.output.textContent, "Warnings:\nwarning\n\nOutput:\nresult");
      assert.equal(tool.copyButton.classList.contains("hidden"), false);
      await tool.copyOutput();
      assert.deepEqual(tool.writeText.mock.calls, [["result"], ["result"]]);
    });
  }

  it("rejects when the Clipboard API is unavailable without losing the output", async () => {
    const tool = transform();
    vi.stubGlobal("navigator", {});
    tool.setOutput("result");
    await assert.rejects(tool.copyOutput(), TypeError);
    assert.equal(tool.output.textContent, "Output:\nresult");
    assert.equal(tool.copyButton.classList.contains("hidden"), false);
  });
});
