import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { loadTransform } from "../helpers/transform-controls.js";

/** @type {{ name: string, input: string, expected: string }[]} */
const cases = [
  {
    name: "subtracts several arrays, trims entries, ignores blank lines, and sorts the remainder",
    input: "\n z.example, b.example, c.example, a.example, d.example \n\t\n b.example \r\n c.example \n",
    expected: "Output:\na.example,d.example,z.example",
  },
  {
    name: "removes only one occurrence per match and retains unremoved duplicates",
    input: "a.example,b.example,a.example,a.example\na.example",
    expected: "Output:\na.example,a.example,b.example",
  },
  {
    name: "exhausts duplicate and empty entries across arrays before warning in input order",
    input:
      " b.example, a.example, , a.example, , a.example \n a.example, \n a.example,a.example,a.example,,\n b.example,b.example",
    expected: 'Warnings:\nNo entry "a.example"\nNo entry ""\nNo entry "b.example"\n\nOutput:\n',
  },
  {
    name: "warns about missing entries and entries that have already been removed",
    input: "a.example,b.example\na.example, missing.example\na.example,b.example",
    expected: 'Warnings:\nNo entry "missing.example"\nNo entry "a.example"\n\nOutput:\n',
  },
  {
    name: "can remove every entry without warnings",
    input: "a.example,b.example\nb.example,a.example",
    expected: "Output:\n",
  },
  {
    name: "warns for a single nonblank array and returns its sorted entries",
    input: "\n b.example, a.example \n \t\n",
    expected: "Warnings:\nOnly one array found!\n\nOutput:\na.example,b.example",
  },
  {
    name: "treats empty and dotless entries as literal values to subtract",
    input: "b.example,,local,a.example\n,local",
    expected: "Output:\na.example,b.example",
  },
  {
    name: "warns about an unmatched empty entry",
    input: "a.example\nb.example,",
    expected: 'Warnings:\nNo entry "b.example"\nNo entry ""\n\nOutput:\na.example',
  },
  {
    name: "matches complete entries case-sensitively without removing related domains",
    input: "Example.com,example.com,sub.example.com\nexample.com,EXAMPLE.COM",
    expected: 'Warnings:\nNo entry "EXAMPLE.COM"\n\nOutput:\nExample.com,sub.example.com',
  },
  {
    name: "treats prototype-related names as literal entries",
    input: "__proto__,constructor,toString,hasOwnProperty\nconstructor,__proto__,constructor",
    expected: 'Warnings:\nNo entry "constructor"\n\nOutput:\nhasOwnProperty,toString',
  },
];

describe("unmerge-domains", () => {
  for (const { name, input, expected } of cases) {
    it(name, async () => {
      const tool = await loadTransform("unmerge-domains");
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
      const tool = await loadTransform("unmerge-domains");
      tool.input.value = input;
      tool.transform.click();
      assert.equal(tool.output.textContent, "Output:\n");
      assert.equal(tool.output.hidden, false);
      assert.equal(tool.copy.classList.contains("hidden"), false);
    });
  }

  it("starts with a hidden copy button and no output", async () => {
    const tool = await loadTransform("unmerge-domains");
    assert.equal(tool.output.textContent, "");
    assert.equal(tool.output.hidden, true);
    assert.equal(tool.status.textContent, "");
    assert.equal(tool.copy.classList.contains("hidden"), true);
  });

  it("copies only the latest result and preserves the current input and selection", async () => {
    const tool = await loadTransform("unmerge-domains");
    /** @type {string[]} */
    const inputsDuringCopy = [];
    const writeText = vi.fn(async (/** @type {string} */ _text) => {
      inputsDuringCopy.push(tool.input.value);
    });
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    /** @type {string[][]} */
    const expectedCalls = [];
    for (const example of [cases[0], cases[cases.length - 1], { input: "", expected: "Output:\n" }]) {
      tool.input.value = example.input;
      tool.transform.click();
      tool.input.value = "new, untransformed input";
      tool.input.focus();
      tool.input.setSelectionRange(2, 7, "backward");
      tool.copy.click();
      await vi.waitFor(() => assert.equal(tool.status.textContent, "Output copied to clipboard."));
      expectedCalls.push([example.expected.split("Output:\n")[1]]);
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

  it("recomputes output and warnings when transforming repeatedly", async () => {
    const tool = await loadTransform("unmerge-domains");
    const warning = cases.find((example) => example.expected.startsWith("Warnings:"));
    for (const example of [warning ?? cases[1], cases[0], cases[0], { input: "", expected: "Output:\n" }]) {
      tool.input.value = example.input;
      tool.transform.click();
      assert.equal(tool.output.textContent, example.expected);
      assert.equal(tool.output.hidden, false);
      assert.equal(tool.copy.classList.contains("hidden"), false);
    }
  });
});
