import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { loadPage } from "../helpers/load-page.js";

const PARSED_MESSAGE = "Input successfully parsed. The array field now contains decoded JSON.";
const PARSE_FAILURE_MESSAGE =
  "Could not parse input. Enter a complete array literal, including square brackets. Expressions are not supported.";
const EMPTY_ARRAY_MESSAGE = "The array is empty. Add a value and select Parse.";
const NOTHING_PARSED_MESSAGE = "Parse a nonempty array before searching.";

/**
 * Load the analyzer and expose its controls and interactions.
 */
async function analyzer() {
  const window = await loadPage("JavaScriptAnalyzer");
  const container = /** @type {HTMLElement} */ (window.document.getElementById("unhex"));
  const input = /** @type {HTMLTextAreaElement} */ (container.querySelector("textarea"));
  const [indexInput, valueInput] = container.querySelectorAll("input");
  const [parseButton, indexButton, valueButton] = container.querySelectorAll("button");
  const output = /** @type {HTMLPreElement} */ (container.querySelector("pre"));
  return {
    window,
    input,
    output,
    indexInput,
    valueInput,
    status: container.querySelector('[role="status"]'),
    /**
     * @param {string} source Array literal to enter and parse.
     * @returns {string} Results text after clicking Parse.
     */
    parse(source) {
      input.value = source;
      parseButton.click();
      return output.textContent;
    },
    /**
     * @param {string} value Substring to search for in string values.
     * @returns {string} Matching values, or empty text when no results are displayed.
     */
    findIndex(value) {
      indexInput.value = value;
      indexButton.click();
      return output.textContent;
    },
    /**
     * @param {string} index Index text, including malformed input used to test validation.
     * @returns {string} Value text, or empty text when no result is displayed.
     */
    findValue(index) {
      valueInput.value = index;
      valueButton.click();
      return output.textContent;
    },
  };
}

/**
 * Check status-only feedback and ensure previous results are cleared and hidden.
 * @param {Awaited<ReturnType<typeof analyzer>>} tool Analyzer controls.
 * @param {string} output Results text after the action.
 * @param {string} message Expected complete status message.
 */
function assertMessage(tool, output, message) {
  assert.equal(output, "");
  assert.equal(tool.output.hidden, true);
  assert.equal(tool.status.textContent, message);
}

/**
 * Check index validation without changing the existing output or status.
 * @param {Awaited<ReturnType<typeof analyzer>>} tool Analyzer controls.
 * @param {string} index Invalid index to look up.
 * @param {string} message Expected field error.
 */
function assertValueError(tool, index, message) {
  const output = tool.output.textContent;
  const hidden = tool.output.hidden;
  const status = tool.status.textContent;
  assert.equal(tool.findValue(index), output);
  assert.equal(tool.output.hidden, hidden);
  assert.equal(tool.status.textContent, status);
  assert.equal(tool.valueInput.getAttribute("aria-invalid"), "true");
  assert.equal(tool.window.document.getElementById("find-value-error").textContent, message);
}

describe("unhex", () => {
  it("announces results without reading the entire dataset or moving focus", async () => {
    const tool = await analyzer();
    assert.equal(tool.output.hidden, true);
    tool.input.focus();
    tool.parse('["first", "second", ""]');
    assert.equal(tool.status.textContent, "Input successfully parsed. The array field now contains decoded JSON.");
    assert.equal(tool.window.document.activeElement, tool.input);
    tool.indexInput.focus();
    tool.findIndex("s");
    assert.equal(tool.status.textContent, "Matching string values: 2. Results are ready below.");
    assert.equal(tool.output.textContent, "0:first\n1:second");
    assert.equal(tool.output.hidden, false);
    assert.equal(tool.window.document.activeElement, tool.indexInput);
    tool.findIndex("missing");
    assert.equal(tool.status.textContent, "No matching string values found.");
    assert.equal(tool.output.textContent, "");
    assert.equal(tool.output.hidden, true);
    assert.equal(tool.window.document.activeElement, tool.indexInput);
    tool.valueInput.focus();
    tool.findValue("-1");
    assert.equal(tool.status.textContent, "Value found at index 2. The value has no text representation.");
    assert.equal(tool.output.textContent, "");
    assert.equal(tool.output.hidden, true);
    assert.equal(tool.window.document.activeElement, tool.valueInput);
    tool.findValue("0");
    assert.equal(tool.status.textContent, "Value found at index 0. The result is ready below.");
    assert.equal(tool.output.textContent, "first");
    assert.equal(tool.output.hidden, false);
    assert.equal(tool.window.document.activeElement, tool.valueInput);
  });

  it("handles each search form submission without navigating", async () => {
    const tool = await analyzer();
    tool.parse('["first", "second"]');
    tool.indexInput.value = "s";
    tool.valueInput.value = "1";
    for (const [id, expected, status] of [
      ["find-index-form", "0:first\n1:second", "Matching string values: 2. Results are ready below."],
      ["find-value-form", "second", "Value found at index 1. The result is ready below."],
    ]) {
      const form = tool.window.document.getElementById(id);
      const event = new Event("submit", { bubbles: true, cancelable: true });
      assert.equal(form.dispatchEvent(event), false);
      assert.equal(tool.output.textContent, expected);
      assert.equal(tool.output.hidden, false);
      assert.equal(tool.status.textContent, status);
    }
  });

  it("associates errors with their fields and clears them when corrected", async () => {
    const tool = await analyzer();
    vi.spyOn(tool.window.console, "log").mockImplementation(() => {});
    tool.parse("[");
    assert.equal(tool.input.getAttribute("aria-invalid"), "true");
    const parseError = tool.window.document.getElementById("unhex-input-error");
    assert.equal(
      parseError.textContent,
      "Enter a complete array literal, including square brackets. Expressions are not supported.",
    );
    assert.equal(tool.input.getAttribute("aria-describedby").split(/\s+/).includes(parseError.id), true);
    assert.equal(tool.status.textContent, `Could not parse input. ${parseError.textContent}`);
    tool.input.dispatchEvent(new Event("input"));
    assert.equal(tool.input.hasAttribute("aria-invalid"), false);
    assert.equal(parseError.textContent, "");
    tool.parse('["value"]');
    const status = tool.status.textContent;
    tool.findValue("bad");
    const indexError = tool.window.document.getElementById("find-value-error");
    assert.equal(tool.valueInput.getAttribute("aria-invalid"), "true");
    assert.equal(indexError.textContent, "Enter an integer, for example 0 or -1.");
    assert.equal(tool.valueInput.getAttribute("aria-describedby").split(/\s+/).includes(indexError.id), true);
    assert.equal(tool.status.textContent, status);
    tool.valueInput.dispatchEvent(new Event("input"));
    assert.equal(tool.valueInput.hasAttribute("aria-invalid"), false);
    assert.equal(indexError.textContent, "");
    tool.findValue("10");
    assert.equal(indexError.textContent, "Use an index from -1 to 0.");
    assert.equal(tool.status.textContent, status);
    tool.findValue("0");
    assert.equal(tool.valueInput.hasAttribute("aria-invalid"), false);
    assert.equal(indexError.textContent, "");
  });

  describe("parse", () => {
    for (const [source, message] of [
      ['["replacement"]', PARSED_MESSAGE],
      ["[", PARSE_FAILURE_MESSAGE],
      ["[]", EMPTY_ARRAY_MESSAGE],
    ]) {
      it(`clears old results and index errors when parsing ${source}`, async () => {
        const tool = await analyzer();
        vi.spyOn(tool.window.console, "log").mockImplementation(() => {});
        tool.parse('["old"]');
        assert.equal(tool.findValue("0"), "old");
        assertValueError(tool, "bad", "Enter an integer, for example 0 or -1.");

        assertMessage(tool, tool.parse(source), message);
        assert.equal(tool.valueInput.hasAttribute("aria-invalid"), false);
        assert.equal(tool.window.document.getElementById("find-value-error").textContent, "");
      });
    }

    it("decodes hexadecimal strings and rewrites the input as JSON", async () => {
      const tool = await analyzer();
      assert.equal(tool.output.textContent, "");
      assertMessage(
        tool,
        tool.parse(String.raw`['\x6c\x6f\x67', '\x74\x65\x73\x74\x31\x32\x33', '\x74\x65\x73\x74\x33\x32\x31']`),
        PARSED_MESSAGE,
      );
      assert.equal(tool.input.value, '["log","test123","test321"]');
      assert.equal(tool.findIndex("test"), "1:test123\n2:test321");
      assert.equal(tool.findValue("0"), "log");
    });

    it("accepts ordinary arrays with strings and non-string values", async () => {
      const tool = await analyzer();
      assertMessage(tool, tool.parse('["text", 42, true, null, {"a": 1}, ["nested"]]'), PARSED_MESSAGE);
      assert.equal(tool.input.value, '["text",42,true,null,{"a":1},["nested"]]');
    });

    it("preserves literal values and empty slots when searching normalized input", async () => {
      const tool = await analyzer();
      assertMessage(
        tool,
        tool.parse("/* data */ [undefined,, NaN, Infinity, -0x10, {key: 'value'}, 'last',];"),
        PARSED_MESSAGE,
      );
      assert.equal(tool.input.value, '[null,null,null,null,-16,{"key":"value"},"last"]');
      for (const [index, expected] of ["", "", "NaN", "Infinity", "-16", "[object Object]", "last"].entries()) {
        assert.equal(tool.findValue(String(index)), expected);
      }
      assert.equal(tool.findIndex("last"), "6:last");
      assert.equal(tool.findValue("-1"), "last");
    });

    it("rejects executable input without running it and clears previous data", async () => {
      const tool = await analyzer();
      vi.stubGlobal("injected", undefined);
      vi.spyOn(tool.window.console, "log").mockImplementation(() => {});
      for (const source of [
        "[]; window.injected = true",
        "[window.injected = true]",
        "[(() => { window.injected = true; return 'value'; })()]",
        "[`${window.injected = true}`]",
        "[].constructor.constructor('window.injected = true')()",
      ]) {
        tool.parse("['old']");
        assertMessage(tool, tool.parse(source), PARSE_FAILURE_MESSAGE);
        assert.equal(tool.input.value, source);
        assert.equal(tool.window.injected, undefined);
        assertMessage(tool, tool.findIndex("old"), NOTHING_PARSED_MESSAGE);
        assertMessage(tool, tool.findValue("0"), NOTHING_PARSED_MESSAGE);
      }
    });

    for (const source of ["[]", " /* empty */ [ ] ; "]) {
      it(`explains the nonempty requirement when parsing ${JSON.stringify(source)} and recovers`, async () => {
        const tool = await analyzer();
        assertMessage(tool, tool.parse(source), EMPTY_ARRAY_MESSAGE);
        assert.equal(tool.input.value, source);
        assert.equal(tool.input.getAttribute("aria-invalid"), "true");
        const error = tool.window.document.getElementById("unhex-input-error");
        assert.equal(error.textContent, EMPTY_ARRAY_MESSAGE);
        assert.equal(tool.input.getAttribute("aria-describedby").split(/\s+/).includes(error.id), true);
        assertMessage(tool, tool.findIndex("anything"), NOTHING_PARSED_MESSAGE);
        assertMessage(tool, tool.findValue("0"), NOTHING_PARSED_MESSAGE);

        assertMessage(tool, tool.parse('["entry"]'), PARSED_MESSAGE);
        assert.equal(tool.input.hasAttribute("aria-invalid"), false);
        assert.equal(error.textContent, "");
        assert.equal(tool.findIndex("entry"), "0:entry");
        assert.equal(tool.findValue("0"), "entry");
      });
    }

    for (const source of ["", "['unterminated]"]) {
      it(`reports ${source ? "malformed array syntax" : "empty input"} without overwriting the input`, async () => {
        const tool = await analyzer();
        const log = vi.spyOn(tool.window.console, "log").mockImplementation(() => {});
        assertMessage(tool, tool.parse(source), PARSE_FAILURE_MESSAGE);
        assert.equal(tool.input.value, source);
        assert.equal(log.mock.calls.length, 1);
        assert.equal(log.mock.calls[0].length, 1);
        assert.equal(log.mock.calls[0][0].name, "SyntaxError");
        assert.equal(log.mock.calls[0][0].message, `Invalid array literal at position ${source.length}.`);
        assertMessage(tool, tool.findIndex("anything"), NOTHING_PARSED_MESSAGE);
        assertMessage(tool, tool.findValue("0"), NOTHING_PARSED_MESSAGE);
      });
    }

    it("replaces previous data when parsing again", async () => {
      const tool = await analyzer();
      tool.parse('["old", "stale"]');
      tool.parse('["new"]');
      assert.equal(tool.findIndex("old"), "");
      assert.equal(tool.findValue("0"), "new");
      assertValueError(tool, "1", "Use an index from -1 to 0.");
      tool.parse("[]");
      assertMessage(tool, tool.findValue("0"), NOTHING_PARSED_MESSAGE);
    });

    it("clears previous data after a parse failure and recovers on the next valid parse", async () => {
      const tool = await analyzer();
      vi.spyOn(tool.window.console, "log").mockImplementation(() => {});
      tool.parse('["old"]');
      assertMessage(tool, tool.parse("["), PARSE_FAILURE_MESSAGE);
      assertMessage(tool, tool.findIndex("old"), NOTHING_PARSED_MESSAGE);
      assertMessage(tool, tool.findValue("0"), NOTHING_PARSED_MESSAGE);
      assertMessage(tool, tool.parse('["recovered"]'), PARSED_MESSAGE);
      assert.equal(tool.input.hasAttribute("aria-invalid"), false);
      assert.equal(tool.window.document.getElementById("unhex-input-error").textContent, "");
      assert.equal(tool.findValue("0"), "recovered");
    });

    it("uses the parsed data until Parse is clicked again", async () => {
      const tool = await analyzer();
      tool.parse('["original"]');
      tool.input.value = '["edited"]';
      tool.input.dispatchEvent(new Event("input"));
      assert.equal(tool.findIndex("original"), "0:original");
      assert.equal(tool.findValue("0"), "original");
      assert.equal(tool.input.value, '["edited"]');

      assertMessage(tool, tool.parse(tool.input.value), PARSED_MESSAGE);
      assertMessage(tool, tool.findIndex("original"), "No matching string values found.");
      assert.equal(tool.findIndex("edited"), "0:edited");
      assert.equal(tool.findValue("0"), "edited");
    });

    it("keeps sparse nonempty arrays searchable and replaces them with a truly empty array", async () => {
      const tool = await analyzer();
      assertMessage(tool, tool.parse("[,,]"), PARSED_MESSAGE);
      assert.equal(tool.input.value, "[null,null]");
      assert.equal(tool.findIndex(""), "");
      assert.equal(tool.findValue("0"), "");
      assert.equal(tool.findValue("-2"), "");
      assertValueError(tool, "2", "Use an index from -2 to 1.");
      assertValueError(tool, "-3", "Use an index from -2 to 1.");
      assertMessage(tool, tool.parse("[]"), EMPTY_ARRAY_MESSAGE);
      assertMessage(tool, tool.findIndex(""), NOTHING_PARSED_MESSAGE);
      assertMessage(tool, tool.findValue("-1"), NOTHING_PARSED_MESSAGE);
    });

    it("round-trips decoded strings through the displayed JSON on a second parse", async () => {
      const tool = await analyzer();
      const source = String.raw`['\x00\n\t\uD800', '\u{1F600}', '\\x41', '\"']`;
      const values = ["\0\n\t\ud800", "\u{1f600}", "\\x41", '"'];
      assertMessage(tool, tool.parse(source), PARSED_MESSAGE);
      const normalized = JSON.stringify(values);
      assert.equal(tool.input.value, normalized);
      for (let pass = 0; pass < 2; pass++) {
        for (const [index, value] of values.entries()) {
          assert.equal(tool.findValue(String(index)), value);
        }
        assert.equal(tool.findIndex("\u{1f600}"), "1:\u{1f600}");
        assert.equal(tool.findIndex("\\x41"), "2:\\x41");
        assertMessage(tool, tool.parse(tool.input.value), PARSED_MESSAGE);
        assert.equal(tool.input.value, normalized);
      }
    });
  });

  describe("find index", () => {
    it("reports nothing parsed before the first parse", async () => {
      const tool = await analyzer();
      assertMessage(tool, tool.findIndex("anything"), NOTHING_PARSED_MESSAGE);
    });

    it("finds substrings in every string value and skips non-string values", async () => {
      const tool = await analyzer();
      tool.parse('[42, "test123", null, true, {"text":"test"}, ["test"], "test321", "other", "test123"]');
      assert.equal(tool.findIndex("test"), "1:test123\n6:test321\n8:test123");
      assert.equal(tool.findIndex("123"), "1:test123\n8:test123");
      assert.equal(tool.findIndex("other"), "7:other");
    });

    it("returns every string, including empty strings, for an empty query", async () => {
      const tool = await analyzer();
      tool.parse('["", 12, "alpha", null, "beta"]');
      assert.equal(tool.findIndex(""), "0:\n2:alpha\n4:beta");
    });

    it("uses case-sensitive literal matching and clears previous results when there is no match", async () => {
      const tool = await analyzer();
      tool.parse('["Alpha", "alpha", "a.b", "axb"]');
      assert.equal(tool.findIndex("Alpha"), "0:Alpha");
      assert.equal(tool.findIndex("a.b"), "2:a.b");
      assert.equal(tool.findIndex("ALPHA"), "");
      assert.equal(tool.findIndex("missing"), "");
    });

    it("returns no matches for an array containing only non-string values", async () => {
      const tool = await analyzer();
      tool.parse('[42, null, false, {}, ["nested"]]');
      assert.equal(tool.findIndex(""), "");
    });

    it("preserves search whitespace and matches decoded Unicode literally", async () => {
      const tool = await analyzer();
      tool.parse(String.raw`['\u00e9', 'e\u0301', '\u{1F600}', ' padded ', 'padded']`);
      assert.equal(tool.findIndex("\u00e9"), "0:\u00e9");
      assert.equal(tool.findIndex("e\u0301"), "1:e\u0301");
      assert.equal(tool.findIndex("\u{1f600}"), "2:\u{1f600}");
      assert.equal(tool.findIndex(" padded "), "3: padded ");
      assert.equal(tool.findIndex("padded"), "3: padded \n4:padded");
      assert.equal(tool.findIndex("\\u00e9"), "");
    });
  });

  describe("find value", () => {
    it("reports nothing parsed before validating the index", async () => {
      const tool = await analyzer();
      assertMessage(tool, tool.findValue("0"), NOTHING_PARSED_MESSAGE);
      assertMessage(tool, tool.findValue("invalid"), NOTHING_PARSED_MESSAGE);
    });

    for (const [index, expected] of [
      ["0", "first"],
      ["1", "middle"],
      ["2", "last"],
      ["-1", "last"],
      ["-2", "middle"],
      ["-3", "first"],
      ["-0", "first"],
      ["  +1  ", "middle"],
      ["  -1  ", "last"],
      ["+0", "first"],
      ["01", "middle"],
      ["-03", "first"],
    ]) {
      it(`looks up decimal integer ${JSON.stringify(index)}`, async () => {
        const tool = await analyzer();
        tool.parse('["first", "middle", "last"]');
        assert.equal(tool.findValue(index), expected);
      });
    }

    for (const index of [
      "",
      " ",
      "abc",
      "NaN",
      "Infinity",
      "-Infinity",
      "+",
      "-",
      "++1",
      "--1",
      "+-1",
      "+ 1",
      "1 0",
      "1.8",
      "2garbage",
      "-0.5",
      "1.9",
      "1suffix",
      "  2garbage  ",
      "1.0",
      "1.0000000000000001",
      ".5",
      "1e0",
      "1e2",
      "0x",
      "0x2",
      "0X2",
      "-0x1",
      "0b1",
      "0o1",
      "1_0",
      "\uff11",
      "9007199254740992",
      "-9007199254740992",
      "9007199254740993",
      "-9007199254740993",
      "9".repeat(400),
    ]) {
      it(`rejects ${index.length > 20 ? "an overflowing integer" : JSON.stringify(index)} as an invalid integer`, async () => {
        const tool = await analyzer();
        tool.parse('["first", "middle", "last"]');
        assert.equal(tool.findValue("0"), "first");
        assertValueError(tool, index, "Enter an integer, for example 0 or -1.");
      });
    }

    for (const index of ["3", "100", "-4", "-100", "9007199254740991", "-9007199254740991"]) {
      it(`rejects out-of-range index ${index}`, async () => {
        const tool = await analyzer();
        tool.parse('["first", "middle", "last"]');
        assert.equal(tool.findIndex("i"), "0:first\n1:middle");
        assertValueError(tool, index, "Use an index from -3 to 2.");
      });
    }

    it("displays string and non-string values using DOM text conversion", async () => {
      const tool = await analyzer();
      tool.parse('["", 42, false, null, {"a":1}, ["a","b"]]');
      for (const [index, expected] of ["", "42", "false", "", "[object Object]", "a,b"].entries()) {
        assert.equal(tool.findValue(String(index)), expected);
      }
    });

    for (const source of [
      '{"toString":null}',
      '{"toString":"<b>data</b>","valueOf":42}',
      '{"toString":{"nested":true}}',
      '[{"toString":false}]',
      '[[{"toString":[]}],"tail"]',
    ]) {
      it(`displays ${source} as JSON when it cannot be converted to text`, async () => {
        const tool = await analyzer();
        assertMessage(tool, tool.parse(`[${source},"searchable"]`), PARSED_MESSAGE);
        assert.equal(tool.findValue("0"), source);
        assert.equal(tool.output.children.length, 0);
        assert.equal(tool.findIndex("search"), "1:searchable");
        assert.equal(tool.findValue("-2"), source);
        assert.equal(tool.findValue("1"), "searchable");
      });
    }

    it("replaces errors with a successful result on the next search", async () => {
      const tool = await analyzer();
      tool.parse('["value", "next"]');
      assertValueError(tool, "bad", "Enter an integer, for example 0 or -1.");
      assert.equal(tool.findValue("0"), "value");
      assert.equal(tool.valueInput.hasAttribute("aria-invalid"), false);
      assert.equal(tool.window.document.getElementById("find-value-error").textContent, "");
      assertValueError(tool, "2", "Use an index from -2 to 1.");
      assert.equal(tool.findValue("-1"), "next");
      assert.equal(tool.valueInput.hasAttribute("aria-invalid"), false);
      assert.equal(tool.window.document.getElementById("find-value-error").textContent, "");
    });
  });

  it("displays matching strings as text without interpreting HTML", async () => {
    const tool = await analyzer();
    tool.parse('["<b>hello</b>"]');
    assert.equal(tool.findIndex("hello"), "0:<b>hello</b>");
    assert.equal(tool.output.children.length, 0);
    assert.equal(tool.findValue("0"), "<b>hello</b>");
    assert.equal(tool.output.children.length, 0);
  });
});
