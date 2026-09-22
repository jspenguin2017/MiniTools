import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { loadTransform } from "../helpers/transform-controls.js";

/** @type {{ name: string, input: string, expected: string }[]} */
const cases = [
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
    name: "extracts the hostname from a URL with a username and password",
    input: "https://alice:password@example.com/path",
    expected: "Output:\nexample.com",
  },
  {
    name: "extracts the hostname from a URL with only a username",
    input: "https://alice@example.net/path",
    expected: "Output:\nexample.net",
  },
  {
    name: "handles escaped credentials and cleans the hostname after parsing",
    input: "label https://alice%40mail.example:p%3Ass%2Fword@WWW12.EXAMPLE.COM:8080/path?query#fragment trailing text",
    expected: "Output:\nexample.com",
  },
  {
    name: "preserves the complete bracketed IPv6 hostname and removes the port",
    input: "https://[2001:db8::1]:8080/",
    expected: "Output:\n[2001:db8::1]",
  },
  {
    name: "parses IPv6 hosts without ports and with credentials",
    input: "http://[::1]/\nhttps://alice:password@[2001:DB8::1]:8080/path",
    expected: "Output:\n[2001:db8::1],[::1]",
  },
  {
    name: "preserves IPv4 hosts while removing credentials and ports",
    input: "http://alice:password@192.0.2.1:8080/path",
    expected: "Output:\n192.0.2.1",
  },
  {
    name: "accepts uppercase and mixed-case HTTP schemes and normalizes hostnames",
    input: "HTTPS://EXAMPLE.COM/path\nlabel hTtP://WWW.Example.NET/path",
    expected: "Output:\nexample.com,example.net",
  },
  {
    name: "normalizes internationalized and percent-encoded hostnames using URL parsing",
    input: "https://www.bücher.example/path\nhttps://%65xample.com/path",
    expected: "Output:\nexample.com,xn--bcher-kva.example",
  },
  ...[
    "https://[2001:db8::1",
    "https://example.com:invalid/",
    "https://example.com:65536/",
    "https://alice@/",
    "https://bad..example.com",
    "https://bad_name.example.com",
    "https://example.com)",
    "https://example.com,",
    "https://example.com.",
    "https://localhost",
    "https://-example.com",
    "https://example-.com",
    "https://www..example.com",
    "https://www.bad_name.example.com",
    "https://www.%5Fexample.com",
    "https://999.999.999.999",
    `https://${"a".repeat(64)}.example`,
    `https://www.${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(58)}`,
  ].map((input) => ({
    name: `warns about an invalid URL (${input}) and continues processing other lines`,
    input: `https://before.example\n${input}\nhttps://after.example`,
    expected: `Warnings:\nInvalid link "${input}"\n\nOutput:\nafter.example,before.example`,
  })),
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
      'Warnings:\nMultiple HTTP(S) prefixes (only the first link candidate is parsed) "https://b.example http://ignored.example https://also-ignored.example"\n\nOutput:\na.example,b.example',
  },
  {
    name: "warns about extra links regardless of scheme case and keeps the first hostname",
    input: "HTTPS://alice:password@EXAMPLE.COM/path hTtP://ignored.example/path",
    expected:
      'Warnings:\nMultiple HTTP(S) prefixes (only the first link candidate is parsed) "HTTPS://alice:password@EXAMPLE.COM/path hTtP://ignored.example/path"\n\nOutput:\nexample.com',
  },
  {
    name: "warns about an invalid first URL without falling back to the second link",
    input: "https://[invalid]/ HTTPS://valid.example",
    expected:
      'Warnings:\nMultiple HTTP(S) prefixes (only the first link candidate is parsed) "https://[invalid]/ HTTPS://valid.example"\nInvalid link "https://[invalid]/ HTTPS://valid.example"\n\nOutput:\n',
  },
  {
    name: "rejects a malformed first hostname without falling back to the second link",
    input: "https://bad..example.com https://valid.example",
    expected:
      'Warnings:\nMultiple HTTP(S) prefixes (only the first link candidate is parsed) "https://bad..example.com https://valid.example"\nInvalid link "https://bad..example.com https://valid.example"\n\nOutput:\n',
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
    expected:
      'Warnings:\nMultiple HTTP(S) prefixes (only the first link candidate is parsed) "http: https:"\nNo link "http: https:"\n\nOutput:\n',
  },
];

describe("links-to-domains", () => {
  for (const { name, input, expected } of cases) {
    it(name, async () => {
      const tool = await loadTransform("links-to-domains");
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
      const tool = await loadTransform("links-to-domains");
      tool.input.value = input;
      tool.transform.click();
      assert.equal(tool.output.textContent, "Output:\n");
      assert.equal(tool.output.hidden, false);
      assert.equal(tool.copy.classList.contains("hidden"), false);
    });
  }

  it("starts with a hidden copy button and no output", async () => {
    const tool = await loadTransform("links-to-domains");
    assert.equal(tool.output.textContent, "");
    assert.equal(tool.output.hidden, true);
    assert.equal(tool.status.textContent, "");
    assert.equal(tool.copy.classList.contains("hidden"), true);
  });

  it("copies only the latest result and preserves the current input and selection", async () => {
    const tool = await loadTransform("links-to-domains");
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
    const tool = await loadTransform("links-to-domains");
    for (const [input, expected, status] of [
      [
        "no link\nhttps://first.example",
        'Warnings:\nNo link "no link"\n\nOutput:\nfirst.example',
        "Transformation complete. Warnings: 1. Output is ready below.",
      ],
      [
        "https://replacement.example",
        "Output:\nreplacement.example",
        "Transformation complete. Warnings: 0. Output is ready below.",
      ],
      [
        "https://replacement.example",
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

  it("renders warnings as text without inserting HTML", async () => {
    const tool = await loadTransform("links-to-domains");
    tool.input.value = "<b>missing link</b>";
    tool.transform.click();
    assert.equal(tool.output.textContent, 'Warnings:\nNo link "<b>missing link</b>"\n\nOutput:\n');
    assert.equal(tool.output.children.length, 0);
  });
});
