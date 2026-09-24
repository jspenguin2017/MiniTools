import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { loadTransform } from "../helpers/transform-controls.js";

/** @type {{ name: string, input: string, expected: string }[]} */
const cases = [
  {
    name: "subtracts several lists, trims entries, ignores blank lines, and sorts the remainder",
    input: "\n z.example, b.example, c.example, a.example, d.example \n\t\n b.example \r\n c.example \n",
    expected: "Output:\na.example,d.example,z.example",
  },
  {
    name: "removes only one occurrence per match and retains unremoved duplicates",
    input: "a.example,b.example,a.example,a.example\na.example",
    expected: "Output:\na.example,a.example,b.example",
  },
  {
    name: "exhausts duplicates and rejects empty entries while preserving warning order",
    input:
      " b.example, a.example, , a.example, , a.example \n a.example, \n a.example,a.example,a.example,,\n b.example,b.example",
    expected:
      'Warnings:\nInvalid entry ""\nInvalid entry ""\nInvalid entry ""\nNo entry "a.example"\nInvalid entry ""\nInvalid entry ""\nNo entry "b.example"\n\nOutput:\n',
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
    name: "warns for a single nonblank list and returns its sorted entries",
    input: "\n b.example, a.example \n \t\n",
    expected: "Warnings:\nOnly one list found!\n\nOutput:\na.example,b.example",
  },
  {
    name: "rejects empty and dotless entries in the initial and subtraction lists",
    input: "b.example,,local,a.example\n,local",
    expected:
      'Warnings:\nInvalid entry ""\nInvalid entry "local"\nInvalid entry ""\nInvalid entry "local"\n\nOutput:\na.example,b.example',
  },
  {
    name: "warns about an invalid empty entry after an unmatched domain",
    input: "a.example\nb.example,",
    expected: 'Warnings:\nNo entry "b.example"\nInvalid entry ""\n\nOutput:\na.example',
  },
  {
    name: "matches complete entries case-sensitively without removing related domains",
    input: "Example.com,example.com,sub.example.com\nexample.com,EXAMPLE.COM",
    expected: 'Warnings:\nNo entry "EXAMPLE.COM"\n\nOutput:\nExample.com,sub.example.com',
  },
  {
    name: "handles domains containing prototype-related labels without special treatment",
    input: "constructor.example,toString.example,hasOwnProperty.example\nconstructor.example,constructor.example",
    expected: 'Warnings:\nNo entry "constructor.example"\n\nOutput:\nhasOwnProperty.example,toString.example',
  },
  {
    name: "rejects every entry in a single invalid list",
    input: "bad..example.com,",
    expected: 'Warnings:\nInvalid entry "bad..example.com"\nInvalid entry ""\nOnly one list found!\n\nOutput:\n',
  },
  {
    name: "keeps the first nonblank line as the base even when all its entries are invalid",
    input: "\ninvalid\nvalid.example",
    expected: 'Warnings:\nInvalid entry "invalid"\nNo entry "valid.example"\n\nOutput:\n',
  },
  ...[
    "bad..example.com",
    "bad_name.example.com",
    "example.com)",
    "https://example.com",
    "example.com:443",
    "example.com/path",
    "example.com.",
    "-example.com",
    "example-.com",
    "bücher.example",
    "999.999.999.999",
    "[2001:db8::1",
    "[2001:db8:::1]",
    "[::1]:443",
    `${"a".repeat(64)}.example`,
    `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`,
  ].map((entry) => ({
    name: `skips invalid entries in the base and removal lists (${JSON.stringify(entry)})`,
    input: `keep.example,${entry},remove.example,keep.example\n${entry},remove.example`,
    expected: `Warnings:\nInvalid entry "${entry}"\nInvalid entry "${entry}"\n\nOutput:\nkeep.example,keep.example`,
  })),
  {
    name: "accepts IPv4, Punycode, and bracketed IPv6 with exact occurrence-based matching",
    input: "[2001:DB8::1],[2001:db8::1],[::1],[::1],192.0.2.1,xn--bcher-kva.example\n[2001:db8::1],[::1],192.0.2.1",
    expected: "Output:\n[2001:DB8::1],[::1],xn--bcher-kva.example",
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
    for (const example of [
      cases[0],
      cases[cases.length - 1],
      {
        input: "keep.example,remove.example\nremove.example,missing.example",
        expected: 'Warnings:\nNo entry "missing.example"\n\nOutput:\nkeep.example',
      },
      { input: "", expected: "Output:\n" },
    ]) {
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
    for (const [input, expected, status] of [
      [
        "first.example\nmissing.example",
        'Warnings:\nNo entry "missing.example"\n\nOutput:\nfirst.example',
        "Transformation complete. Warnings: 1. Output is ready below.",
      ],
      [
        "replacement.example,remove.example\nremove.example",
        "Output:\nreplacement.example",
        "Transformation complete. Warnings: 0. Output is ready below.",
      ],
      [
        "replacement.example,remove.example\nremove.example",
        "Output:\nreplacement.example",
        "Transformation complete. Warnings: 0. Output is ready below.",
      ],
      ["", "Output:\n", "Transformation complete. Warnings: 0. Output is empty."],
    ]) {
      tool.input.value = input;
      tool.transform.click();
      assert.equal(tool.output.textContent, expected);
      assert.equal(tool.status.textContent, status);
      assert.equal(tool.output.hidden, false);
      assert.equal(tool.copy.classList.contains("hidden"), false);
    }
  });
});
