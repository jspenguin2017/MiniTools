import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { loadTransform } from "../helpers/transform-controls.js";

/** @type {{ name: string, input: string, expected: string }[]} */
const cases = [
  {
    name: "merges and sorts several arrays while trimming entries and ignoring blank lines",
    input: "\n z.example, a.example \n  \t\n c.example , b.example\r\n d.example \n",
    expected: "Output:\na.example,b.example,c.example,d.example,z.example",
  },
  {
    name: "rejects the malformed entries reported in FT-3",
    input: "https://example.com/a,foo bar.example,..\nvalid.example",
    expected:
      'Warnings:\nInvalid entry "https://example.com/a"\nInvalid entry "foo bar.example"\nInvalid entry ".."\n\nOutput:\nvalid.example',
  },
  ...[
    "https://example.com",
    "//example.com",
    "example.com/",
    "example.com/path",
    "example.com\\path",
    "example.com?query",
    "example.com#fragment",
    "example.com:",
    "example.com:443",
    "user@example.com",
    "user:password@example.com",
    "foo\tbar.example",
    "foo\u0000bar.example",
    "foo\u00a0bar.example",
    "%65xample.com",
    ".example.com",
    "example..com",
    "example.com.",
    "-example.com",
    "example-.com",
    "foo_bar.example",
    "bad..example.com",
    "bad_name.example.com",
    "example.com)",
    "foo!bar.example",
    "~example.com",
    "*.example.com",
    "bücher.example",
    "999.999.999.999",
    "[2001:db8::1",
    "[2001:db8:::1]",
    "[::1]:443",
    "[::1]/path/[::2]",
    `${"a".repeat(64)}.example`,
    `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`,
  ].map((entry) => ({
    name: `warns about a malformed domain (${JSON.stringify(entry)}) and continues merging`,
    input: `before.example,${entry}\n${entry},after.example,before.example`,
    expected: `Warnings:\nInvalid entry "${entry}"\nInvalid entry "${entry}"\nDuplicate entry "before.example"\n\nOutput:\nafter.example,before.example`,
  })),
  {
    name: "preserves valid subdomains, hyphens, Punycode names, and IPv4 addresses",
    input: "sub.a-b.example,xn--bcher-kva.example\n192.0.2.1,123.example,a.b",
    expected: "Output:\n123.example,192.0.2.1,a.b,sub.a-b.example,xn--bcher-kva.example",
  },
  {
    name: "accepts the maximum hostname and label lengths",
    input: `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}\nvalid.example`,
    expected: `Output:\n${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)},valid.example`,
  },
  {
    name: "accepts bracketed IPv6 while preserving spelling and exact duplicate matching",
    input: "[2001:DB8::1],[::1]\n[2001:db8::1],[::1],example.com",
    expected: 'Warnings:\nDuplicate entry "[::1]"\n\nOutput:\n[2001:DB8::1],[2001:db8::1],[::1],example.com',
  },
  {
    name: "removes duplicates within and between arrays and warns for each duplicate",
    input: "b.example,b.example,a.example\na.example,c.example,b.example",
    expected:
      'Warnings:\nDuplicate entry "b.example"\nDuplicate entry "a.example"\nDuplicate entry "b.example"\n\nOutput:\na.example,b.example,c.example',
  },
  {
    name: "removes empty and dotless entries while preserving warning order",
    input: "a.example, ,localhost\n,b.example,invalid,",
    expected:
      'Warnings:\nInvalid entry ""\nInvalid entry "localhost"\nInvalid entry ""\nInvalid entry "invalid"\nInvalid entry ""\n\nOutput:\na.example,b.example',
  },
  {
    name: "warns for a single nonblank array",
    input: "\n b.example, a.example \n \t\n",
    expected: "Warnings:\nOnly one array found!\n\nOutput:\na.example,b.example",
  },
  {
    name: "handles a single array with no valid entries",
    input: "invalid,",
    expected: 'Warnings:\nInvalid entry "invalid"\nInvalid entry ""\nOnly one array found!\n\nOutput:\n',
  },
  {
    name: "detects duplicates after trimming and distinguishes exact entries",
    input: " Example.com,example.com,a.example \nexample.com, Example.com ,sub.a.example",
    expected:
      'Warnings:\nDuplicate entry "example.com"\nDuplicate entry "Example.com"\n\nOutput:\nExample.com,a.example,example.com,sub.a.example',
  },
  {
    name: "counts invalid nonblank lines as arrays and warns for every invalid occurrence",
    input: "invalid,invalid\n,",
    expected:
      'Warnings:\nInvalid entry "invalid"\nInvalid entry "invalid"\nInvalid entry ""\nInvalid entry ""\n\nOutput:\n',
  },
];

describe("merge-domains", () => {
  for (const { name, input, expected } of cases) {
    it(name, async () => {
      const tool = await loadTransform("merge-domains");
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
      const tool = await loadTransform("merge-domains");
      tool.input.value = input;
      tool.transform.click();
      assert.equal(tool.output.textContent, "Output:\n");
      assert.equal(tool.output.hidden, false);
      assert.equal(tool.copy.classList.contains("hidden"), false);
    });
  }

  it("starts with a hidden copy button and no output", async () => {
    const tool = await loadTransform("merge-domains");
    assert.equal(tool.output.textContent, "");
    assert.equal(tool.output.hidden, true);
    assert.equal(tool.status.textContent, "");
    assert.equal(tool.copy.classList.contains("hidden"), true);
  });

  it("copies only the latest result and preserves the current input and selection", async () => {
    const tool = await loadTransform("merge-domains");
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
    const tool = await loadTransform("merge-domains");
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
