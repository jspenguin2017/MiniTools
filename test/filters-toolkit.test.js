import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { loadPage } from "./helpers/load-page.js";

/**
 * Find the controls for one Filters Toolkit container.
 * @param {Window & typeof globalThis} window Loaded test window.
 * @param {string} id Tool container ID in the page markup.
 */
function controls(window, id) {
  const container = /** @type {HTMLElement} */ (window.document.getElementById(id));
  const [transform, copy] = container.querySelectorAll("button");
  return {
    input: /** @type {HTMLTextAreaElement} */ (container.querySelector("textarea")),
    output: /** @type {HTMLPreElement} */ (container.querySelector("pre")),
    transform,
    copy,
  };
}

/**
 * @typedef {object} TransformCase
 * @property {string} name Behavior described by the test.
 * @property {string} input Text entered in the textarea.
 * @property {string} expected Full displayed output, including warnings and labels.
 */

/** @type {Record<string, TransformCase[]>} */
const cases = {
  "links-to-domains": [
    {
      name: "extracts HTTP and HTTPS domains, trims lines, sorts, and preserves duplicates",
      input: "  https://z.example/path  \n\n  \t\nlabel http://a.example\r\nhttps://z.example/other\n",
      expected: "Output:\na.example,z.example,z.example",
    },
    {
      name: "stops the domain at a port, path, query, or fragment",
      input: "https://d.example:8080/a\nhttp://c.example/path\nhttps://b.example?query\nhttps://a.example#fragment",
      expected: "Output:\na.example,b.example,c.example,d.example",
    },
    {
      name: "stops bare domains at spaces and tabs before trailing text",
      input: "https://b.example trailing text\nhttps://a.example\tmore text",
      expected: "Output:\na.example,b.example",
    },
    {
      name: "cleans ww and www prefixes with optional digits and retains other subdomains",
      input:
        "https://www.a.example\nhttps://www12.b.example\nhttp://ww.c.example\nhttp://ww2.d.example\nhttps://sub.e.example\nhttps://w.f.example",
      expected: "Output:\na.example,b.example,c.example,d.example,sub.e.example,w.f.example",
    },
    {
      name: "preserves www-like registrable domains and only removes a leading prefix once",
      input:
        "https://www.com\nhttps://ww.com\nhttps://www12.com\nhttps://ww2.com\nhttps://sub.www.example.com\nhttps://www.www.example.com\nhttps://wwwx.example.com\nhttps://wwww.example.com",
      expected:
        "Output:\nsub.www.example.com,ww.com,ww2.com,www.com,www.example.com,www12.com,wwww.example.com,wwwx.example.com",
    },
    {
      name: "preserves duplicate domains created by prefix cleanup",
      input: "https://www.a.example/path\nhttp://a.example\nhttps://ww12.a.example",
      expected: "Output:\na.example,a.example,a.example",
    },
    {
      name: "warns about extra links and extracts only the first link",
      input: "  https://b.example http://ignored.example https://also-ignored.example  \nhttp://a.example",
      expected:
        'Warnings:\nTwo links (second one ignored) "https://b.example http://ignored.example https://also-ignored.example"\n\nOutput:\na.example,b.example',
    },
    {
      name: "warns about missing links while retaining valid lines",
      input: "  no link  \nftp://files.example\nhttps://\nhttps://valid.example",
      expected:
        'Warnings:\nNo link "no link"\nNo link "ftp://files.example"\nNo link "https://"\n\nOutput:\nvalid.example',
    },
    {
      name: "reports both warnings when repeated protocols contain no valid link",
      input: "http: https:",
      expected: 'Warnings:\nTwo links (second one ignored) "http: https:"\nNo link "http: https:"\n\nOutput:\n',
    },
  ],
  "merge-domains": [
    {
      name: "merges and sorts several arrays while trimming entries and ignoring blank lines",
      input: "\n z.example, a.example \n  \t\n c.example , b.example\r\n d.example \n",
      expected: "Output:\na.example,b.example,c.example,d.example,z.example",
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
  ],
  "unmerge-domains": [
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
  ],
  "unicode-escape": [
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
  ],
};

describe("Filters Toolkit", () => {
  for (const [id, examples] of Object.entries(cases)) {
    describe(id, () => {
      for (const { name, input, expected } of examples) {
        it(name, async () => {
          const window = await loadPage("FiltersToolkit");
          const tool = controls(window, id);
          tool.input.value = input;
          tool.transform.click();
          assert.equal(tool.output.textContent, expected);
          assert.equal(tool.input.value, input.replace(/\r\n?/g, "\n"));
          assert.equal(tool.copy.classList.contains("hidden"), false);
        });
      }

      for (const input of ["", " \n\t\n"]) {
        it(`handles ${input ? "whitespace-only" : "empty"} input`, async () => {
          const window = await loadPage("FiltersToolkit");
          const tool = controls(window, id);
          tool.input.value = input;
          tool.transform.click();
          assert.equal(tool.output.textContent, "Output:\n" + (id === "unicode-escape" ? input : ""));
          assert.equal(tool.copy.classList.contains("hidden"), false);
        });
      }

      it("starts with a hidden copy button and no output", async () => {
        const window = await loadPage("FiltersToolkit");
        const tool = controls(window, id);
        assert.equal(tool.output.textContent, "");
        assert.equal(tool.copy.classList.contains("hidden"), true);
      });

      it("copies only the latest result and preserves the current input and selection", async () => {
        const window = await loadPage("FiltersToolkit");
        const tool = controls(window, id);
        /** @type {string[]} */
        const inputsDuringCopy = [];
        // jsdom has no system clipboard. Capture text passed to the Clipboard API.
        const writeText = vi.fn(async (/** @type {string} */ _text) => {
          inputsDuringCopy.push(tool.input.value);
        });
        vi.stubGlobal("navigator", { clipboard: { writeText } });
        for (const example of [examples[0], examples[examples.length - 1], { input: "", expected: "Output:\n" }]) {
          tool.input.value = example.input;
          tool.transform.click();
          tool.input.value = "new, untransformed input";
          tool.input.focus();
          tool.input.setSelectionRange(2, 7, "backward");
          tool.copy.click();
          const call = writeText.mock.calls.at(-1);
          assert.ok(call);
          await writeText.mock.results.at(-1).value;
          assert.equal(call.length, 1);
          assert.equal(call[0], example.expected.split("Output:\n")[1]);
          assert.equal(inputsDuringCopy.at(-1), "new, untransformed input");
          assert.equal(tool.input.value, "new, untransformed input");
          assert.equal(window.document.activeElement, tool.input);
          assert.equal(tool.input.selectionStart, 2);
          assert.equal(tool.input.selectionEnd, 7);
          assert.equal(tool.input.selectionDirection, "backward");
          assert.equal(tool.output.textContent, example.expected);
        }
        assert.equal(writeText.mock.calls.length, 3);
      });

      it("recomputes output and warnings when transforming repeatedly", async () => {
        const window = await loadPage("FiltersToolkit");
        const tool = controls(window, id);
        const warning = examples.find((example) => example.expected.startsWith("Warnings:"));
        for (const example of [
          warning ?? examples[1],
          examples[0],
          examples[0],
          { input: "", expected: "Output:\n" },
        ]) {
          tool.input.value = example.input;
          tool.transform.click();
          assert.equal(tool.output.textContent, example.expected);
          assert.equal(tool.copy.classList.contains("hidden"), false);
        }
      });
    });
  }

  it("keeps transforms and their copy buffers independent", async () => {
    const window = await loadPage("FiltersToolkit");
    const tools = Object.entries(cases).map(([id, examples]) => ({ ...controls(window, id), example: examples[0] }));
    const writeText = vi.fn(async (/** @type {string} */ _text) => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    for (const tool of tools) {
      tool.input.value = tool.example.input;
      tool.transform.click();
    }
    for (const tool of tools.toReversed()) {
      tool.copy.click();
      const call = writeText.mock.calls.at(-1);
      assert.ok(call);
      await writeText.mock.results.at(-1).value;
      assert.equal(call.length, 1);
      assert.equal(call[0], tool.example.expected.slice("Output:\n".length));
      for (const other of tools) {
        assert.equal(other.output.textContent, other.example.expected);
        assert.equal(other.input.value, other.example.input.replace(/\r\n?/g, "\n"));
      }
    }
    assert.equal(writeText.mock.calls.length, tools.length);
  });

  it("preserves the complete ASCII range after textarea newline normalization", async () => {
    const window = await loadPage("FiltersToolkit");
    const tool = controls(window, "unicode-escape");
    const ascii = String.fromCharCode(...Array.from({ length: 128 }, (_, index) => index));
    tool.input.value = ascii;
    tool.transform.click();
    assert.equal(tool.output.textContent, "Output:\n" + ascii.replace(/\r/g, "\n"));
  });

  it("renders input and warnings as text without inserting HTML", async () => {
    const window = await loadPage("FiltersToolkit");
    const links = controls(window, "links-to-domains");
    const unicode = controls(window, "unicode-escape");
    links.input.value = "<b>missing link</b>";
    links.transform.click();
    unicode.input.value = "<b>hello</b>";
    unicode.transform.click();
    assert.equal(links.output.textContent, 'Warnings:\nNo link "<b>missing link</b>"\n\nOutput:\n');
    assert.equal(unicode.output.textContent, "Output:\n<b>hello</b>");
    assert.equal(links.output.children.length, 0);
    assert.equal(unicode.output.children.length, 0);
  });
});
