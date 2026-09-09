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
    ["arrays containing only empty slots", "[,,,[,,],undefined,]", [, , , [, ,], undefined]],
    ["empty strings with either quote style", `['', ""]`, ["", ""]],
    ["comments and a final semicolon", "/* before */ [ // entry\n 'value' /* after */, ]; // end", ["value"]],
    ["adjacent and empty comments", "/**/// before\n[/**/1,/**/2/**/]/**/;/**///", [1, 2]],
    ["line comment terminators", "[// CR\r1,// CRLF\r\n2,// LS\u20283,// PS\u20294,// LF\n5]// EOF", [1, 2, 3, 4, 5]],
    ["Unicode whitespace", "\ufeff[\u00a0' spaced '\u2028]\u2029", [" spaced "]],
    ["hexadecimal escapes", String.raw`['\x00\x6c\x6F\x67\xFF']`, ["\0log\u00ff"]],
    [
      "Unicode escapes",
      String.raw`['\u0041\u00e9\uD83D\uDE00\u{1F600}\u{10ffff}']`,
      ["A\u00e9\u{1f600}\u{1f600}\u{10ffff}"],
    ],
    ["lone surrogates", String.raw`['\uD800', '\u{DFFF}']`, ["\ud800", "\udfff"]],
    [
      "Unicode escape boundaries and leading zeroes",
      String.raw`['\u{0}\u{00000041}\u{FFFF}\u{10000}\u{10FFFF}', '\x004\u00412']`,
      ["\0A\uffff\u{10000}\u{10ffff}", "\x004A2"],
    ],
    ["control escapes", String.raw`['\0\b\f\n\r\t\v']`, ["\0\b\f\n\r\t\v"]],
    ["quotes and identity escapes", String.raw`['\'\"\\\/\q', "\"\'\\"]`, ["'\"\\/q", "\"'\\"]],
    ["literal backslashes", String.raw`['\\x41', '\\u0041', '\\n', '\\1']`, ["\\x41", "\\u0041", "\\n", "\\1"]],
    ["line continuations", "['a\\\nb\\\rc\\\r\nd\\\u2028e\\\u2029f']", ["abcdef"]],
    ["literal Unicode line separators", "['a\u2028b\u2029c']", ["a\u2028b\u2029c"]],
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
    ["decimal fractions and exponents", "[0., 0.5, 0e1, 0E+1, .5e-2, 1.e2, 1e1_0]", [0, 0.5, 0, 0, 0.005, 100, 1e10]],
    [
      "special values",
      "[undefined, NaN, Infinity, -Infinity, +NaN, 1e400]",
      [undefined, NaN, Infinity, -Infinity, NaN, Infinity],
    ],
    ["comments after a sign", "[- /* comment */ 1, + // comment\n 2]", [-1, 2]],
    ["signed special values", "[+Infinity, -Infinity, +NaN, -NaN]", [Infinity, -Infinity, NaN, NaN]],
    ["signed zero in every radix", "[+0, -0.0, -0e1, -0x0, -0b0, -0o0]", [0, -0, -0, -0, -0, -0]],
    [
      "floating-point limits and rounding",
      "[5e-324, 1e-324, -1e-324, 1.7976931348623157e308, 1.8e308, -1e400, 9007199254740993]",
      [Number.MIN_VALUE, 0, -0, Number.MAX_VALUE, Infinity, -Infinity, 9007199254740992],
    ],
    [
      "object keys",
      "[{a: 1, $key: 2, _key: 3, caf\u00e9: 4, 0x10: 5, 1.5: 6, '': 7, true: 8}]",
      [{ "a": 1, "$key": 2, "_key": 3, "caf\u00e9": 4, "16": 5, "1.5": 6, "": 7, "true": 8 }],
    ],
    [
      "Unicode identifier code points",
      "[{\u{10400}: 1, a\u0301: 2, a\u200c: 3, a\u200d: 4}]",
      [{ "\u{10400}": 1, "a\u0301": 2, "a\u200c": 3, "a\u200d": 4 }],
    ],
    [
      "literal names as object keys",
      "[{Infinity: 1, NaN: 2, undefined: 3, null: 4, false: 5}]",
      [{ Infinity: 1, NaN: 2, undefined: 3, null: 4, false: 5 }],
    ],
    ["duplicate object keys", "[{a: 1, a: 2}]", [{ a: 2 }]],
    [
      "duplicate keys after decoding strings and numeric literals",
      String.raw`[{a: 1, '\x61': 2, 0x10: 3, '16': 4, 1_6: 5, '\u{1f600}': 6}]`,
      [{ "a": 2, "16": 5, "\u{1f600}": 6 }],
    ],
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

  it("defines prototype-related keys as ordinary properties at every nesting level", () => {
    const [value] = /** @type {ArrayLiteralObject[]} */ (
      parseArray("[{__proto__: 1, __proto__: {__proto__: null}, constructor: {prototype: {polluted: true}}}]")
    );
    const nested = /** @type {ArrayLiteralObject} */ (value.__proto__);
    for (const object of [value, nested]) {
      assert.equal(Object.getPrototypeOf(object), Object.prototype);
      assert.deepEqual(Object.getOwnPropertyDescriptor(object, "__proto__"), {
        value: object.__proto__,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      assert.equal(object.polluted, undefined);
    }
    assert.equal(nested.__proto__, null);
    assert.equal(Object.hasOwn(Object.prototype, "polluted"), false);
    assert.equal(
      JSON.stringify(value),
      '{"__proto__":{"__proto__":null},"constructor":{"prototype":{"polluted":true}}}',
    );
  });

  it("distinguishes empty slots from explicit undefined, null, and a trailing comma", () => {
    const value = parseArray("[,undefined,null,,]");
    assert.equal(value.length, 4);
    assert.deepEqual(Object.keys(value), ["1", "2"]);
    assert.equal(value[1], undefined);
    assert.equal(value[2], null);
    assert.deepEqual(parseArray("[undefined,]"), [undefined]);
  });

  it("decodes every byte escape with either quote style and hexadecimal case", () => {
    const bytes = Array.from({ length: 256 }, (_, index) => index);
    const expected = String.fromCharCode(...bytes);
    for (const quote of ["'", '"']) {
      for (const uppercase of [false, true]) {
        const escaped = bytes
          .map((byte) => {
            const hex = byte.toString(16).padStart(2, "0");
            return "\\x" + (uppercase ? hex.toUpperCase() : hex);
          })
          .join("");
        assert.deepEqual(parseArray(`[${quote}${escaped}${quote}]`), [expected]);
      }
    }
  });

  it("agrees with JSON.parse for a varied corpus of nested JSON data", () => {
    const entries = [
      null,
      true,
      false,
      0,
      -0,
      Number.MIN_VALUE,
      Number.MAX_VALUE,
      "",
      "\0\b\f\n\r\t\u001f",
      "quotes: '\" and backslashes: \\",
      "\u00e9\u{1f600}\ud800\udfff\u2028\u2029",
      [],
      {},
      JSON.parse('{"__proto__":null,"constructor":1,"toString":"data","toJSON":false}'),
    ];
    for (const entry of entries) {
      const value = [entry, { "": entry, "nested": [entry, { value: entry }] }];
      for (const indentation of [undefined, 2]) {
        const source = JSON.stringify(value, null, indentation);
        assert.deepEqual(parseArray(source), JSON.parse(source), source);
      }
    }
  });

  it("returns independent data on repeated calls and recovers after invalid input", () => {
    const source = "[{nested: ['original']}]";
    const first = /** @type {ArrayLiteralObject[]} */ (parseArray(source));
    /** @type {ArrayLiteralValue[]} */ (first[0].nested).push("changed");
    first.push({ extra: true });
    assert.throws(() => parseArray("[{nested: ["), SyntaxError);
    assert.deepEqual(parseArray(source), [{ nested: ["original"] }]);
  });

  it("rejects every truncated prefix of a nested literal", () => {
    const source = String.raw`[/* comment */{key: ['\x41', "\u{1F600}", -1.25e+2, true, null]}]`;
    assert.deepEqual(parseArray(source), [{ key: ["A", "\u{1f600}", -125, true, null] }]);
    for (let length = 0; length < source.length; length++) {
      const prefix = source.slice(0, length);
      assert.throws(() => parseArray(prefix), SyntaxError, JSON.stringify(prefix));
    }
  });

  for (const [source, position] of /** @type {[string, number][]} */ ([
    ["[1 2]", 3],
    ["[{a 1}]", 4],
    ["['line\nbreak']", 6],
    [String.raw`['\xG0']`, 4],
    ["[] extra", 3],
    ["[] /* unterminated", 3],
    ['["\u{1f600}", unknown]', 7],
  ])) {
    it(`reports the source position for ${JSON.stringify(source)}`, () => {
      assert.throws(() => parseArray(source), {
        name: "SyntaxError",
        message: `Invalid array literal at position ${position}.`,
      });
    });
  }

  for (const source of [
    "",
    " ",
    "[",
    "[1",
    "[1 2]",
    "[[1]",
    "[{a: 1]",
    "[{a: [1, 2}}]",
    "[] []",
    "[]; []",
    "/* comment only */",
    "// comment only",
    "['unterminated]",
    "['trailing\\",
    "['\\x0",
    "['\\u000",
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
    String.raw`['\u{-1}']`,
    String.raw`['\u{+41}']`,
    String.raw`['\u{ 41}']`,
    String.raw`['\u{1_0}']`,
    String.raw`['\x{41}']`,
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
    "[0x1_]",
    "[0b12]",
    "[0o78]",
    "[1e+]",
    "[1e_2]",
    "[1.2.3]",
    "[.]",
    "[.e1]",
    "[0b]",
    "[0o]",
    "[0b_1]",
    "[0o_7]",
    "[0b1_]",
    "[0o7_]",
    "[1e1_]",
    "[1e+_2]",
    "[1e-]",
    "[1/* comment */2]",
    "[0x1.2]",
    "[0b1n]",
    "[1n]",
    "[+true]",
    "[+'1']",
    "[+InfinityValue]",
    "[+NaNValue]",
    "[--1]",
    "[++]",
    "[+-1]",
    "[-null]",
    "[-undefined]",
    "[-[]]",
    "[-{}]",
    "[{]",
    "[{,}]",
    "[{a 1}]",
    "[{a: 1 b: 2}]",
    "[{a:}]",
    "[{a}]",
    "[{a: 1,,}]",
    "[{-1: true}]",
    "[{...{a: 1}}]",
    "[{set key(value) {}}]",
    "[{'key'}]",
    "[/* unterminated]",
    "[] /* unterminated",
    "[] extra",
    "[];;",
    "[trueValue]",
    "[true\u00e9]",
    "[false_1]",
    "[null$]",
    "[undefined\u200c]",
    "[Infinity\u{10400}]",
    "[InfinityValue]",
    "[NaNValue]",
    "[toString]",
    "[constructor]",
    "[__proto__]",
    "null",
    "undefined",
    "42",
    "'text'",
    "{}",
    "[window]",
    "[Math.PI]",
    "[/pattern/gi]",
    "[`plain template`]",
    "[(1)]",
    "[true ? 1 : 2]",
    "[1, ...[2]]",
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
