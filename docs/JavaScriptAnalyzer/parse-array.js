/**
 * An array of literal values, possibly containing empty slots.
 * @typedef {Array<ArrayLiteralValue>} ArrayLiteralArray
 */

/**
 * A literal object whose own properties contain supported values.
 * @typedef {{ [key: string]: ArrayLiteralValue }} ArrayLiteralObject
 */

/**
 * A supported literal value. Arrays can be sparse; numbers include NaN and infinities.
 * @typedef {string | number | boolean | null | undefined | ArrayLiteralArray | ArrayLiteralObject} ArrayLiteralValue
 */

/**
 * A decoded token with its starting position in the source.
 * @typedef {({ type: "string" | "identifier" | "punctuation", value: string } |
 *   { type: "number", value: number } | { type: "eof" }) & { position: number }} ArrayLiteralToken
 */

const WHITESPACE_PATTERN = /\s/u;
const IDENTIFIER_PATTERN = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/u;
const LINE_TERMINATORS = new Set(["\n", "\r", "\u2028", "\u2029"]);

/** @type {Record<string, number>} */
const NUMBER_RADICES = {
  x: 16,
  b: 2,
  o: 8,
};

/** @type {Record<string, string>} */
const STRING_ESCAPES = {
  "0": "\0",
  "b": "\b",
  "f": "\f",
  "n": "\n",
  "r": "\r",
  "t": "\t",
  "v": "\v",
  "\n": "",
  "\r": "",
  "\u2028": "",
  "\u2029": "",
};

/** @type {Record<string, number | boolean | null | undefined>} */
const LITERAL_VALUES = {
  true: true,
  false: false,
  null: null,
  undefined: undefined,
  Infinity: Infinity,
  NaN: NaN,
};

/**
 * @param {number} position Position of the invalid syntax.
 * @returns {never}
 */
const invalid = (position) => {
  throw new SyntaxError(`Invalid array literal at position ${position}.`);
};

/**
 * @param {string} character Character to check, or an empty string at the end of the source.
 * @param {number} radix Numeric base.
 * @returns {boolean} Whether the character is a digit in this base.
 */
const isDigit = (character, radix) => {
  const digit = "0123456789abcdef".indexOf(character.toLowerCase());
  return character !== "" && digit >= 0 && digit < radix;
};

/** Scan literal tokens, decoding strings and numbers without executing JavaScript. */
class ArrayLiteralTokenizer {
  /** @param {string} source Literal source text. */
  constructor(source) {
    this.source = source;
    this.index = 0;
  }

  /** @returns {ArrayLiteralToken} The next token after whitespace and comments. */
  next() {
    this.skipSpace();
    const position = this.index;
    const character = this.source.charAt(this.index);
    if (character === "") {
      return { type: "eof", position };
    }
    if ("[]{},:;+-".includes(character)) {
      this.index++;
      return { type: "punctuation", value: character, position };
    }
    if (character === '"' || character === "'") {
      return { type: "string", value: this.readString(), position };
    }
    if (isDigit(character, 10) || character === ".") {
      return { type: "number", value: this.readNumber(), position };
    }
    const identifier = IDENTIFIER_PATTERN.exec(this.source.slice(this.index));
    if (identifier !== null) {
      this.index += identifier[0].length;
      return { type: "identifier", value: identifier[0], position };
    }
    invalid(this.index);
  }

  /** @returns {void} Consume whitespace and both JavaScript comment forms. */
  skipSpace() {
    while (this.index < this.source.length) {
      if (WHITESPACE_PATTERN.test(this.source.charAt(this.index))) {
        this.index++;
      } else if (this.source.startsWith("//", this.index)) {
        this.index += 2;
        while (this.index < this.source.length && !LINE_TERMINATORS.has(this.source.charAt(this.index))) {
          this.index++;
        }
      } else if (this.source.startsWith("/*", this.index)) {
        const end = this.source.indexOf("*/", this.index + 2);
        if (end === -1) {
          invalid(this.index);
        }
        this.index = end + 2;
      } else {
        break;
      }
    }
  }

  /** @returns {string} A decoded single- or double-quoted string. */
  readString() {
    const quote = this.source.charAt(this.index++);
    let value = "";
    while (this.index < this.source.length) {
      const character = this.source.charAt(this.index++);
      if (character === quote) {
        return value;
      }
      if (character === "\n" || character === "\r") {
        invalid(this.index - 1);
      }
      value += character === "\\" ? this.readEscape() : character;
    }
    invalid(this.index);
  }

  /** @returns {string} A decoded escape or an empty line continuation. */
  readEscape() {
    if (this.index === this.source.length) {
      invalid(this.index);
    }
    const escape = this.source.charAt(this.index++);
    if (escape === "x" || escape === "u") {
      return this.readHexEscape(escape === "x" ? 2 : 4);
    }
    // Legacy octal and decimal escapes are invalid in strict JavaScript
    if (isDigit(escape, 10) && (escape !== "0" || isDigit(this.source.charAt(this.index), 10))) {
      invalid(this.index - 1);
    }
    if (escape === "\r" && this.source.charAt(this.index) === "\n") {
      this.index++;
    }
    return STRING_ESCAPES[escape] ?? escape;
  }

  /**
   * @param {number} length Required hex digits, unless a Unicode escape uses braces.
   * @returns {string} The escaped code unit or code point.
   */
  readHexEscape(length) {
    const braced = length === 4 && this.source.charAt(this.index) === "{";
    if (braced) {
      this.index++;
    }
    const end = braced ? this.source.indexOf("}", this.index) : this.index + length;
    if (end === -1 || end === this.index) {
      invalid(this.index);
    }
    let code = 0;
    while (this.index < end) {
      const character = this.source.charAt(this.index);
      if (!isDigit(character, 16)) {
        invalid(this.index);
      }
      code = code * 16 + parseInt(character, 16);
      this.index++;
    }
    if (braced) {
      this.index++;
    }
    if (code > 0x10ffff) {
      invalid(this.index);
    }
    return String.fromCodePoint(code);
  }

  /**
   * @param {number} radix Numeric base.
   * @returns {void} Consume at least one digit, allowing separators only between digits.
   */
  readDigits(radix) {
    const start = this.index;
    while (isDigit(this.source.charAt(this.index), radix)) {
      this.index++;
      if (this.source.charAt(this.index) === "_") {
        this.index++;
        if (!isDigit(this.source.charAt(this.index), radix)) {
          invalid(this.index);
        }
      }
    }
    if (this.index === start) {
      invalid(this.index);
    }
  }

  /** @returns {number} An unsigned number with optional separators, radix, fraction, or exponent. */
  readNumber() {
    const start = this.index;
    if (this.source.charAt(this.index) === ".") {
      this.index++;
      this.readDigits(10);
    } else {
      if (this.source.charAt(this.index) === "0") {
        const radix = NUMBER_RADICES[this.source.charAt(this.index + 1).toLowerCase()];
        if (radix !== undefined) {
          this.index += 2;
          this.readDigits(radix);
          return Number(this.source.slice(start, this.index).replaceAll("_", ""));
        }
        this.index++;
        if (isDigit(this.source.charAt(this.index), 10) || this.source.charAt(this.index) === "_") {
          invalid(this.index);
        }
      } else {
        this.readDigits(10);
      }
      if (this.source.charAt(this.index) === ".") {
        this.index++;
        if (isDigit(this.source.charAt(this.index), 10)) {
          this.readDigits(10);
        }
      }
    }
    const exponent = this.source.charAt(this.index);
    if (exponent === "e" || exponent === "E") {
      this.index++;
      const sign = this.source.charAt(this.index);
      if (sign === "+" || sign === "-") {
        this.index++;
      }
      this.readDigits(10);
    }
    return Number(this.source.slice(start, this.index).replaceAll("_", ""));
  }
}

/** Parse literal data with one token of lookahead. */
class ArrayLiteralParser {
  /** @param {string} source Array literal source text. */
  constructor(source) {
    this.tokenizer = new ArrayLiteralTokenizer(source);
    this.token = this.tokenizer.next();
  }

  /** @returns {ArrayLiteralValue[]} A single array, optionally followed by a semicolon. */
  parse() {
    const value = this.readArray();
    this.take(";");
    if (this.token.type !== "eof") {
      invalid(this.token.position);
    }
    return value;
  }

  /**
   * @param {string} punctuation Punctuation to consume if present.
   * @returns {boolean} Whether the token was consumed.
   */
  take(punctuation) {
    if (this.token.type !== "punctuation" || this.token.value !== punctuation) {
      return false;
    }
    this.token = this.tokenizer.next();
    return true;
  }

  /**
   * @param {string} punctuation Required punctuation.
   * @returns {void}
   */
  expect(punctuation) {
    if (!this.take(punctuation)) {
      invalid(this.token.position);
    }
  }

  /** @returns {ArrayLiteralValue[]} An array, preserving empty slots and trailing commas. */
  readArray() {
    this.expect("[");
    /** @type {ArrayLiteralValue[]} */
    const value = [];
    while (!this.take("]")) {
      if (this.take(",")) {
        value.length++;
        continue;
      }
      value.push(this.readValue());
      if (!this.take(",")) {
        this.expect("]");
        break;
      }
    }
    return value;
  }

  /** @returns {ArrayLiteralObject} An object containing only data properties. */
  readObject() {
    this.expect("{");
    /** @type {ArrayLiteralObject} */
    const value = {};
    while (!this.take("}")) {
      const key = this.token;
      if (key.type !== "string" && key.type !== "identifier" && key.type !== "number") {
        invalid(key.position);
      }
      this.token = this.tokenizer.next();
      this.expect(":");
      // Define data properties directly, including keys such as __proto__
      Object.defineProperty(value, key.value, {
        value: this.readValue(),
        writable: true,
        enumerable: true,
        configurable: true,
      });
      if (!this.take(",")) {
        this.expect("}");
        break;
      }
    }
    return value;
  }

  /** @returns {number} A numeric token or one of the supported numeric identifiers. */
  readNumber() {
    const token = this.token;
    if (token.type === "number") {
      this.token = this.tokenizer.next();
      return token.value;
    }
    if (token.type === "identifier" && (token.value === "Infinity" || token.value === "NaN")) {
      this.token = this.tokenizer.next();
      return Number(token.value);
    }
    invalid(token.position);
  }

  /** @returns {ArrayLiteralValue} The next literal value, recursively reading arrays and objects. */
  readValue() {
    const token = this.token;
    if (token.type === "punctuation") {
      switch (token.value) {
        case "[":
          return this.readArray();
        case "{":
          return this.readObject();
        case "+":
        case "-":
          this.token = this.tokenizer.next();
          const number = this.readNumber();
          return token.value === "-" ? -number : number;
      }
    }
    if (token.type === "string" || token.type === "number") {
      this.token = this.tokenizer.next();
      return token.value;
    }
    if (token.type === "identifier" && Object.hasOwn(LITERAL_VALUES, token.value)) {
      this.token = this.tokenizer.next();
      return LITERAL_VALUES[token.value];
    }
    invalid(token.position);
  }
}

/**
 * Parse an array literal as data without executing JavaScript.
 * @param {string} source Array literal with optional comments, whitespace, and a final semicolon.
 * @returns {ArrayLiteralValue[]} Parsed values, preserving nested data and empty slots.
 * @throws {SyntaxError} If the input is malformed, unsupported, or not a single array literal.
 */
export const parseArray = (source) => {
  return new ArrayLiteralParser(source).parse();
};
