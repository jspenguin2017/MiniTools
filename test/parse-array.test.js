import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArray } from "../docs/JavaScriptAnalyzer/parse-array.js";

/** @typedef {import("../docs/JavaScriptAnalyzer/parse-array.js").ArrayLiteralValue} ArrayLiteralValue */
/** @typedef {import("../docs/JavaScriptAnalyzer/parse-array.js").ArrayLiteralObject} ArrayLiteralObject */
/** @typedef {[name: string, source: string, expected: ArrayLiteralValue[]]} ParseCase */

describe("array literal parser", () => {
  for (const [name, source, expected] of /** @type {ParseCase[]} */ ([
    ["empty arrays", "[]", []],
    [
      "nested arrays and objects",
      '[{}, {a: [], "b": {c: [true, false, null]}}]',
      [{}, { a: [], b: { c: [true, false, null] } }],
    ],
    ["trailing commas", "['first', ['nested',], {key: 'value',},]", ["first", ["nested"], { key: "value" }]],
    ["empty slots", "[, 'value',,]", [, "value", ,]],
    ["a trailing empty slot", "[1,,]", [1, ,]],
    ["comments and a final semicolon", "/* before */ [ // entry\n 'value' /* after */, ]; // end", ["value"]],
    ["Unicode whitespace", "\ufeff[\u00a0' spaced '\u2028]\u2029", [" spaced "]],
    ["hexadecimal escapes", String.raw`['\x00\x6c\x6F\x67\xFF']`, ["\0logÿ"]],
    ["Unicode escapes", String.raw`['\u0041\u00e9\uD83D\uDE00\u{1F600}\u{10ffff}']`, ["Aé😀😀\u{10ffff}"]],
    ["lone surrogates", String.raw`['\uD800', '\u{DFFF}']`, ["\ud800", "\udfff"]],
    ["control escapes", String.raw`['\0\b\f\n\r\t\v']`, ["\0\b\f\n\r\t\v"]],
    ["quotes and identity escapes", String.raw`['\'\"\\\/\q', "\"\'\\"]`, ["'\"\\/q", "\"'\\"]],
    ["literal backslashes", String.raw`['\\x41', '\\u0041', '\\n', '\\1']`, ["\\x41", "\\u0041", "\\n", "\\1"]],
    ["line continuations", "['a\\\nb\\\rc\\\r\nd\\\u2028e\\\u2029f']", ["abcdef"]],
    [
      "string contents resembling syntax",
      String.raw`['// comment', '/* comment */', '[,{}];', '"', "'"]`,
      ["// comment", "/* comment */", "[,{}];", '"', "'"],
    ],
    [
      "decimal numbers",
      "[0, -0, +1, -2.5, .25, 1., 1e3, -2E-2, 1_000, 1.2_5e+2]",
      [0, -0, 1, -2.5, 0.25, 1, 1000, -0.02, 1000, 125],
    ],
    [
      "nondecimal numbers",
      "[0xff, -0XFF, +0b10, 0B11, 0o70, 0O7, 0xF_F, 0b1_0, 0o7_0]",
      [255, -255, 2, 3, 56, 7, 255, 2, 56],
    ],
    [
      "special values",
      "[undefined, NaN, Infinity, -Infinity, +NaN, 1e400]",
      [undefined, NaN, Infinity, -Infinity, NaN, Infinity],
    ],
    ["comments after a sign", "[- /* comment */ 1, + // comment\n 2]", [-1, 2]],
    [
      "object keys",
      "[{a: 1, $key: 2, _key: 3, café: 4, 0x10: 5, 1.5: 6, '': 7, true: 8}]",
      [{ "a": 1, "$key": 2, "_key": 3, "café": 4, "16": 5, "1.5": 6, "": 7, "true": 8 }],
    ],
    ["duplicate object keys", "[{a: 1, a: 2}]", [{ a: 2 }]],
  ])) {
    it(`parses ${name}`, () => {
      assert.deepEqual(parseArray(source), expected);
    });
  }

  it("treats prototype-related keys as data", () => {
    const [value] = /** @type {ArrayLiteralObject[]} */ (
      parseArray('[{"__proto__": {"polluted": true}, "constructor": 1, "toString": 2}]')
    );
    assert.equal(Object.getPrototypeOf(value), Object.prototype);
    assert.equal(Object.hasOwn(value, "__proto__"), true);
    assert.deepEqual(value.__proto__, { polluted: true });
    assert.equal(value.polluted, undefined);
    assert.equal(value.constructor, 1);
    assert.equal(value.toString, 2);
  });

  for (const source of [
    "",
    " ",
    "[",
    "[1",
    "[1 2]",
    "['unterminated]",
    "['line\nbreak']",
    "['line\rbreak']",
    String.raw`['\x']`,
    String.raw`['\x0']`,
    String.raw`['\xGG']`,
    String.raw`['\u']`,
    String.raw`['\u000']`,
    String.raw`['\uZZZZ']`,
    String.raw`['\u{}']`,
    String.raw`['\u{xyz}']`,
    String.raw`['\u{41']`,
    String.raw`['\u{110000}']`,
    String.raw`['\1']`,
    String.raw`['\8']`,
    String.raw`['\01']`,
    String.raw`['\09']`,
    "[01]",
    "[00.5]",
    "[0x]",
    "[0b2]",
    "[0o8]",
    "[1e]",
    "[1_]",
    "[1__0]",
    "[0_1]",
    "[1._0]",
    "[0x_1]",
    "[1n]",
    "[+true]",
    "[--1]",
    "[{]",
    "[{,}]",
    "[{a 1}]",
    "[{a: 1 b: 2}]",
    "[{a:}]",
    "[{a}]",
    "[{a: 1,,}]",
    "[/* unterminated]",
    "[] /* unterminated",
    "[] extra",
    "[];;",
    "[trueValue]",
    "null",
    "undefined",
    "42",
    "'text'",
    "{}",
    "[window]",
    "[Math.PI]",
    "[1 + 2]",
    "[...[]]",
    "[{['key']: 1}]",
    "[{get key() { return 1; }}]",
    "[{key() {}}]",
    "[function () {}]",
    "[new Array()]",
    "[(() => 'value')()]",
    "[`value ${alert(1)}`]",
    "[globalThis.injected = true]",
    "[]; globalThis.injected = true",
  ]) {
    it(`rejects ${JSON.stringify(source)}`, () => {
      assert.throws(() => parseArray(source), SyntaxError);
    });
  }
});
