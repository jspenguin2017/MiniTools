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
 * Parse an array literal as data without executing JavaScript.
 * @param {string} source Array literal with optional comments, whitespace, and a final semicolon.
 * @returns {ArrayLiteralValue[]} Parsed values, preserving nested data and empty slots.
 * @throws {SyntaxError} If the input is malformed, unsupported, or not a single array literal.
 */
export const parseArray = (source) => {
  let index = 0;
  /** @type {() => never} Stop parsing at the current position. */
  const invalid = () => {
    throw new SyntaxError(`Invalid array literal at position ${index}.`);
  };
  /**
   * @param {RegExp} pattern Sticky expression to match at the current position.
   * @returns {string | null} Matched text, advancing the position only on success.
   */
  const read = (pattern) => {
    pattern.lastIndex = index;
    const match = pattern.exec(source);
    if (match === null) {
      return null;
    }
    index = pattern.lastIndex;
    return match[0];
  };
  /** @returns {void} Consume whitespace and comments. */
  const skipSpace = () => {
    read(/(?:\s|\/\/[^\r\n\u2028\u2029]*|\/\*[\s\S]*?\*\/)*/y);
  };
  /**
   * @param {string} token Literal token to consume after whitespace and comments.
   * @returns {boolean} Whether the token was consumed.
   */
  const take = (token) => {
    skipSpace();
    if (source.startsWith(token, index)) {
      index += token.length;
      return true;
    }
    return false;
  };
  /**
   * @param {string} token Required token after whitespace and comments.
   * @returns {void}
   * @throws {SyntaxError} If the token is absent.
   */
  const expect = (token) => {
    if (!take(token)) {
      invalid();
    }
  };

  /** @returns {string | null} Decoded quoted string, or null if no string starts here. */
  const readString = () => {
    const token = read(/"(?:[^"\\\r\n]|\\(?:\r\n|[\s\S]))*"|'(?:[^'\\\r\n]|\\(?:\r\n|[\s\S]))*'/y);
    if (token === null) {
      return null;
    }
    return token.slice(1, -1).replace(
      /\\(u\{[^}]*\}|x[\s\S]{2}|u[\s\S]{4}|\r\n|[\s\S])/g,
      /**
       * @param {string} match Full escape sequence, including its backslash.
       * @param {string} escape Captured escape without the backslash.
       * @param {number} offset Position in the unquoted string body.
       * @param {string} body Unquoted string body.
       * @returns {string} Decoded character or line continuation.
       */
      (match, escape, offset, body) => {
        if (escape[0] === "x" || escape[0] === "u") {
          if (!/^(?:x[\da-fA-F]{2}|u[\da-fA-F]{4}|u\{[\da-fA-F]+\})$/.test(escape)) {
            invalid();
          }
          const code = parseInt(escape.slice(1).replace(/[{}]/g, ""), 16);
          if (code > 0x10ffff) {
            invalid();
          }
          return String.fromCodePoint(code);
        }
        // Legacy octal and decimal escapes are invalid in strict JavaScript.
        if (/[0-9]/.test(escape) && (escape !== "0" || /[0-9]/.test(body.charAt(offset + 2)))) {
          invalid();
        }
        /** @type {Record<string, string | undefined>} */
        const escapes = {
          "0": "\0",
          "b": "\b",
          "f": "\f",
          "n": "\n",
          "r": "\r",
          "t": "\t",
          "v": "\v",
          "\n": "",
          "\r": "",
          "\r\n": "",
          "\u2028": "",
          "\u2029": "",
        };
        return escapes[escape] ?? escape;
      },
    );
  };
  /** @returns {string | null} Unsigned numeric token, or null if none starts here. */
  const readNumber = () =>
    read(
      /0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[bB][01](?:_?[01])*|0[oO][0-7](?:_?[0-7])*|(?:(?:0|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|Infinity|NaN/y,
    );
  /**
   * @param {string} token Numeric token returned by readNumber.
   * @returns {number} Numeric value with separator underscores removed.
   */
  const toNumber = (token) => Number(token.replaceAll("_", ""));

  /** @returns {ArrayLiteralValue} The next literal value, recursively reading arrays and objects. */
  const readValue = () => {
    if (take("[")) {
      /** @type {ArrayLiteralValue[]} */
      const value = [];
      while (!take("]")) {
        if (take(",")) {
          value.length++;
          continue;
        }
        value.push(readValue());
        if (!take(",")) {
          expect("]");
          break;
        }
      }
      return value;
    }
    if (take("{")) {
      /** @type {ArrayLiteralObject} */
      const value = {};
      while (!take("}")) {
        /** @type {string | number | null} */
        let key = readString() ?? read(/[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/uy);
        if (key === null) {
          const number = readNumber();
          if (number === null) {
            invalid();
          }
          key = toNumber(number);
        }
        expect(":");
        // Define data properties directly, including keys such as __proto__.
        Object.defineProperty(value, key, {
          value: readValue(),
          writable: true,
          enumerable: true,
          configurable: true,
        });
        if (!take(",")) {
          expect("}");
          break;
        }
      }
      return value;
    }
    const string = readString();
    if (string !== null) {
      return string;
    }
    const sign = read(/[+-]/y);
    skipSpace();
    const number = readNumber();
    if (number !== null) {
      return sign === "-" ? -toNumber(number) : toNumber(number);
    }
    if (sign !== null) {
      invalid();
    }
    const literal = read(/true|false|null|undefined/y);
    if (literal !== null) {
      return /** @type {Record<string, boolean | null | undefined>} */ ({
        true: true,
        false: false,
        null: null,
        undefined: undefined,
      })[literal];
    }
    invalid();
  };

  const value = readValue();
  take(";");
  skipSpace();
  if (!Array.isArray(value) || index !== source.length) {
    invalid();
  }
  return value;
};
