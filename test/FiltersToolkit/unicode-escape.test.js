import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { loadTransform } from "../helpers/transform-controls.js";

/** @type {{ name: string, input: string, expected: string }[]} */
const cases = [
  {
    name: "preserves ASCII, tabs, spaces, commas, backslashes, and DEL",
    input: " AZaz09 ,.!\t\\u0041\u007f ",
    expected: "Output:\n AZaz09 ,.!\t\\u0041\u007f ",
  },
  {
    name: "escapes non-ASCII code units as uppercase, four-digit hex",
    input: "\u0080\u00e9\u00ff\u0100\u4e2d\uffff",
    expected: "Output:\n\\u0080\\u00E9\\u00FF\\u0100\\u4E2D\\uFFFF",
  },
  {
    name: "escapes astral characters as surrogate pairs and combining marks separately",
    input: "\u{1f600}e\u0301",
    expected: "Output:\n\\uD83D\\uDE00e\\u0301",
  },
  {
    name: "preserves leading, internal, and trailing newlines without trimming whitespace",
    input: "\n  \u00e9 \n\n\u4e2d\n",
    expected: "Output:\n\n  \\u00E9 \n\n\\u4E2D\n",
  },
  {
    name: "preserves lone surrogates and escapes Unicode separators and spaces",
    input: "\ud800x\udfff\u00a0\u2028\u2029\ufeff",
    expected: "Output:\n\\uD800x\\uDFFF\\u00A0\\u2028\\u2029\\uFEFF",
  },
  {
    name: "normalizes CR and CRLF through the textarea while preserving empty lines",
    input: "\r\u00e9\r\n\r\u4e2d\r",
    expected: "Output:\n\n\\u00E9\n\n\\u4E2D\n",
  },
];

describe("unicode-escape", () => {
  for (const { name, input, expected } of cases) {
    it(name, async () => {
      const tool = await loadTransform("unicode-escape");
      tool.input.value = input;
      tool.transform.click();
      assert.equal(tool.output.textContent, expected);
      assert.equal(tool.output.hidden, false);
      assert.equal(tool.input.value, input.replace(/\r\n?/g, "\n"));
      assert.equal(tool.copy.classList.contains("hidden"), false);
    });
  }

  for (const input of ["", " \n\t\n"]) {
    it(`handles ${input ? "whitespace-only" : "empty"} input`, async () => {
      const tool = await loadTransform("unicode-escape");
      tool.input.value = input;
      tool.transform.click();
      assert.equal(tool.output.textContent, "Output:\n" + input);
      assert.equal(tool.output.hidden, false);
      assert.equal(tool.copy.classList.contains("hidden"), false);
    });
  }

  it("starts with a hidden copy button and no output", async () => {
    const tool = await loadTransform("unicode-escape");
    assert.equal(tool.output.textContent, "");
    assert.equal(tool.output.hidden, true);
    assert.equal(tool.status.textContent, "");
    assert.equal(tool.copy.classList.contains("hidden"), true);
  });

  it("copies only the latest result and preserves the current input and selection", async () => {
    const tool = await loadTransform("unicode-escape");
    /** @type {string[]} */
    const inputsDuringCopy = [];
    const writeText = vi.fn(async (/** @type {string} */ _text) => {
      inputsDuringCopy.push(tool.input.value);
    });
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    /** @type {string[][]} */
    const expectedCalls = [];
    for (const example of [
      cases[0],
      cases[cases.length - 1],
      { input: "Output:\né\nWarnings:", expected: "Output:\nOutput:\n\\u00E9\nWarnings:" },
      { input: "", expected: "Output:\n" },
    ]) {
      tool.input.value = example.input;
      tool.transform.click();
      tool.input.value = "new, untransformed input";
      tool.input.focus();
      tool.input.setSelectionRange(2, 7, "backward");
      tool.copy.click();
      await vi.waitFor(() => assert.equal(tool.status.textContent, "Output copied to clipboard."));
      expectedCalls.push([example.expected.slice("Output:\n".length)]);
      assert.deepEqual(writeText.mock.calls, expectedCalls);
      assert.deepEqual(
        inputsDuringCopy,
        expectedCalls.map(() => "new, untransformed input"),
      );
      assert.equal(tool.input.value, "new, untransformed input");
      assert.equal(tool.window.document.activeElement, tool.input);
      assert.equal(tool.input.selectionStart, 2);
      assert.equal(tool.input.selectionEnd, 7);
      assert.equal(tool.input.selectionDirection, "backward");
      assert.equal(tool.output.textContent, example.expected);
    }
  });

  it("recomputes output when transforming repeatedly", async () => {
    const tool = await loadTransform("unicode-escape");
    for (const example of [cases[1], cases[0], cases[0], { input: "", expected: "Output:\n" }]) {
      tool.input.value = example.input;
      tool.transform.click();
      assert.equal(tool.output.textContent, example.expected);
      assert.equal(
        tool.status.textContent,
        example.input === ""
          ? "Transformation complete. Warnings: 0. Output is empty."
          : "Transformation complete. Warnings: 0. Output is ready below.",
      );
      assert.equal(tool.output.hidden, false);
      assert.equal(tool.copy.classList.contains("hidden"), false);
    }
  });
  it("preserves the complete ASCII range after textarea newline normalization", async () => {
    const tool = await loadTransform("unicode-escape");
    const ascii = String.fromCharCode(...Array.from({ length: 128 }, (_, index) => index));
    tool.input.value = ascii;
    tool.transform.click();
    assert.equal(tool.output.textContent, "Output:\n" + ascii.replace(/\r/g, "\n"));
  });

  it("renders input as text without inserting HTML", async () => {
    const tool = await loadTransform("unicode-escape");
    tool.input.value = "<b>hello</b>";
    tool.transform.click();
    assert.equal(tool.output.textContent, "Output:\n<b>hello</b>");
    assert.equal(tool.output.children.length, 0);
  });
});
