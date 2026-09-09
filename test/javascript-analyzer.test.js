import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadPage } from "./helpers/load-page.js";

/**
 * Load the analyzer and expose its controls and interactions.
 * @param {import("node:test").TestContext} context Test context that owns the page's lifetime.
 */
async function analyzer(context) {
  const window = await loadPage(context, "JavaScriptAnalyzer");
  const container = /** @type {HTMLElement} */ (window.document.getElementById("unhex"));
  const input = /** @type {HTMLTextAreaElement} */ (container.querySelector("textarea"));
  const [indexInput, valueInput] = container.querySelectorAll("input");
  const [parseButton, indexButton, valueButton] = container.querySelectorAll("button");
  const output = /** @type {HTMLPreElement} */ (container.querySelector("pre"));
  return {
    window,
    input,
    output,
    /**
     * @param {string} source Array literal to enter and parse.
     * @returns {string} Status text after clicking Parse.
     */
    parse(source) {
      input.value = source;
      parseButton.click();
      return output.textContent;
    },
    /**
     * @param {string} value Substring to search for in string entries.
     * @returns {string} Matching entries or status text.
     */
    findIndex(value) {
      indexInput.value = value;
      indexButton.click();
      return output.textContent;
    },
    /**
     * @param {string} index Index text, including malformed input used to test validation.
     * @returns {string} Entry text or validation message.
     */
    findValue(index) {
      valueInput.value = index;
      valueButton.click();
      return output.textContent;
    },
  };
}

describe("JavaScript Analyzer", () => {
  describe("parse", () => {
    it("decodes hexadecimal strings and rewrites the input as JSON", async (context) => {
      const tool = await analyzer(context);
      assert.equal(tool.output.textContent, "");
      assert.equal(
        tool.parse(String.raw`['\x6c\x6f\x67', '\x74\x65\x73\x74\x31\x32\x33', '\x74\x65\x73\x74\x33\x32\x31']`),
        "Input successfully parsed.",
      );
      assert.equal(tool.input.value, '["log","test123","test321"]');
      assert.equal(tool.findIndex("test"), "1:test123\n2:test321");
      assert.equal(tool.findValue("0"), "log");
    });

    it("accepts ordinary arrays with strings and non-string entries", async (context) => {
      const tool = await analyzer(context);
      assert.equal(tool.parse('["text", 42, true, null, {"a": 1}, ["nested"]]'), "Input successfully parsed.");
      assert.equal(tool.input.value, '["text",42,true,null,{"a":1},["nested"]]');
    });

    it("preserves literal values and empty slots when searching normalized input", async (context) => {
      const tool = await analyzer(context);
      assert.equal(
        tool.parse("/* data */ [undefined,, NaN, Infinity, -0x10, {key: 'value'}, 'last',];"),
        "Input successfully parsed.",
      );
      assert.equal(tool.input.value, '[null,null,null,null,-16,{"key":"value"},"last"]');
      for (const [index, expected] of ["", "", "NaN", "Infinity", "-16", "[object Object]", "last"].entries()) {
        assert.equal(tool.findValue(String(index)), expected);
      }
      assert.equal(tool.findIndex("last"), "6:last");
      assert.equal(tool.findValue("-1"), "last");
    });

    it("rejects executable input without running it and clears previous data", async (context) => {
      const tool = await analyzer(context);
      context.mock.method(tool.window.console, "log", () => {});
      for (const source of [
        "[]; window.injected = true",
        "[window.injected = true]",
        "[(() => { window.injected = true; return 'value'; })()]",
        "[`${window.injected = true}`]",
        "[].constructor.constructor('window.injected = true')()",
      ]) {
        tool.parse("['old']");
        assert.equal(tool.parse(source), "Could not parse input.");
        assert.equal(tool.input.value, source);
        assert.equal(tool.window.injected, undefined);
        assert.equal(tool.findIndex("old"), "Nothing parsed.");
        assert.equal(tool.findValue("0"), "Nothing parsed.");
      }
    });

    it("accepts an empty array and reports nothing parsed when searching it", async (context) => {
      const tool = await analyzer(context);
      assert.equal(tool.parse("[]"), "Input successfully parsed.");
      assert.equal(tool.input.value, "[]");
      assert.equal(tool.findIndex("anything"), "Nothing parsed.");
      assert.equal(tool.findValue("0"), "Nothing parsed.");
    });

    for (const source of ["", "['unterminated]"]) {
      it(`reports ${source ? "malformed array syntax" : "empty input"} without overwriting the input`, async (context) => {
        const tool = await analyzer(context);
        const log = context.mock.method(tool.window.console, "log", () => {});
        assert.equal(tool.parse(source), "Could not parse input.");
        assert.equal(tool.input.value, source);
        assert.equal(log.mock.callCount(), 1);
        assert.equal(log.mock.calls[0].arguments[0].name, "SyntaxError");
        assert.equal(tool.findIndex("anything"), "Nothing parsed.");
        assert.equal(tool.findValue("0"), "Nothing parsed.");
      });
    }

    it("replaces previous data when parsing again", async (context) => {
      const tool = await analyzer(context);
      tool.parse('["old", "stale"]');
      tool.parse('["new"]');
      assert.equal(tool.findIndex("old"), "");
      assert.equal(tool.findValue("0"), "new");
      assert.equal(tool.findValue("1"), "Index out of range.");
      tool.parse("[]");
      assert.equal(tool.findValue("0"), "Nothing parsed.");
    });

    it("clears previous data after a parse failure and recovers on the next valid parse", async (context) => {
      const tool = await analyzer(context);
      context.mock.method(tool.window.console, "log", () => {});
      tool.parse('["old"]');
      assert.equal(tool.parse("["), "Could not parse input.");
      assert.equal(tool.findIndex("old"), "Nothing parsed.");
      assert.equal(tool.findValue("0"), "Nothing parsed.");
      assert.equal(tool.parse('["recovered"]'), "Input successfully parsed.");
      assert.equal(tool.findValue("0"), "recovered");
    });

    it("uses the parsed data until Parse is clicked again", async (context) => {
      const tool = await analyzer(context);
      tool.parse('["original"]');
      tool.input.value = '["edited"]';
      assert.equal(tool.findIndex("original"), "0:original");
      assert.equal(tool.findValue("0"), "original");
    });
  });

  describe("find index", () => {
    it("reports nothing parsed before the first parse", async (context) => {
      const tool = await analyzer(context);
      assert.equal(tool.findIndex("anything"), "Nothing parsed.");
    });

    it("finds substrings in every string entry and skips non-string entries", async (context) => {
      const tool = await analyzer(context);
      tool.parse('[42, "test123", null, true, {"text":"test"}, ["test"], "test321", "other", "test123"]');
      assert.equal(tool.findIndex("test"), "1:test123\n6:test321\n8:test123");
      assert.equal(tool.findIndex("123"), "1:test123\n8:test123");
      assert.equal(tool.findIndex("other"), "7:other");
    });

    it("returns every string, including empty strings, for an empty query", async (context) => {
      const tool = await analyzer(context);
      tool.parse('["", 12, "alpha", null, "beta"]');
      assert.equal(tool.findIndex(""), "0:\n2:alpha\n4:beta");
    });

    it("uses case-sensitive literal matching and clears previous results when there is no match", async (context) => {
      const tool = await analyzer(context);
      tool.parse('["Alpha", "alpha", "a.b", "axb"]');
      assert.equal(tool.findIndex("Alpha"), "0:Alpha");
      assert.equal(tool.findIndex("a.b"), "2:a.b");
      assert.equal(tool.findIndex("ALPHA"), "");
      assert.equal(tool.findIndex("missing"), "");
    });

    it("returns no matches for an array containing only non-string entries", async (context) => {
      const tool = await analyzer(context);
      tool.parse('[42, null, false, {}, ["nested"]]');
      assert.equal(tool.findIndex(""), "");
    });
  });

  describe("find value", () => {
    it("reports nothing parsed before validating the index", async (context) => {
      const tool = await analyzer(context);
      assert.equal(tool.findValue("0"), "Nothing parsed.");
      assert.equal(tool.findValue("invalid"), "Nothing parsed.");
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
      ["01", "middle"],
      ["0x2", "last"],
      ["1.9", "middle"],
      ["1suffix", "middle"],
    ]) {
      it(`looks up ${JSON.stringify(index)} using the current parseInt behavior`, async (context) => {
        const tool = await analyzer(context);
        tool.parse('["first", "middle", "last"]');
        assert.equal(tool.findValue(index), expected);
      });
    }

    for (const index of ["", " ", "abc", "NaN", "Infinity", "9".repeat(400)]) {
      it(`rejects ${index.length > 20 ? "an overflowing integer" : JSON.stringify(index)} as an invalid integer`, async (context) => {
        const tool = await analyzer(context);
        tool.parse('["first"]');
        assert.equal(tool.findValue(index), "Index not valid integer.");
      });
    }

    for (const index of ["3", "100", "-4", "-100"]) {
      it(`rejects out-of-range index ${index}`, async (context) => {
        const tool = await analyzer(context);
        tool.parse('["first", "middle", "last"]');
        assert.equal(tool.findValue(index), "Index out of range.");
      });
    }

    it("displays string and non-string values using DOM text conversion", async (context) => {
      const tool = await analyzer(context);
      tool.parse('["", 42, false, null, {"a":1}, ["a","b"]]');
      for (const [index, expected] of ["", "42", "false", "", "[object Object]", "a,b"].entries()) {
        assert.equal(tool.findValue(String(index)), expected);
      }
    });

    it("replaces errors with a successful result on the next search", async (context) => {
      const tool = await analyzer(context);
      tool.parse('["value"]');
      assert.equal(tool.findValue("bad"), "Index not valid integer.");
      assert.equal(tool.findValue("0"), "value");
      assert.equal(tool.findValue("1"), "Index out of range.");
      assert.equal(tool.findValue("-1"), "value");
    });
  });

  it("displays matching strings as text without interpreting HTML", async (context) => {
    const tool = await analyzer(context);
    tool.parse('["<b>hello</b>"]');
    assert.equal(tool.findIndex("hello"), "0:<b>hello</b>");
    assert.equal(tool.output.children.length, 0);
    assert.equal(tool.findValue("0"), "<b>hello</b>");
    assert.equal(tool.output.children.length, 0);
  });
});
