// Parse array literals as data without executing JavaScript.
export const parseArray = (source) => {
  let index = 0;
  const invalid = () => {
    throw new SyntaxError(`Invalid array literal at position ${index}.`);
  };
  const read = (pattern) => {
    pattern.lastIndex = index;
    const match = pattern.exec(source);
    if (match === null) {
      return null;
    }
    index = pattern.lastIndex;
    return match[0];
  };
  const skipSpace = () => {
    read(/(?:\s|\/\/[^\r\n\u2028\u2029]*|\/\*[\s\S]*?\*\/)*/y);
  };
  const take = (token) => {
    skipSpace();
    if (source.startsWith(token, index)) {
      index += token.length;
      return true;
    }
    return false;
  };
  const expect = (token) => {
    if (!take(token)) {
      invalid();
    }
  };

  const readString = () => {
    const token = read(/"(?:[^"\\\r\n]|\\(?:\r\n|[\s\S]))*"|'(?:[^'\\\r\n]|\\(?:\r\n|[\s\S]))*'/y);
    if (token === null) {
      return null;
    }
    return token
      .slice(1, -1)
      .replace(/\\(u\{[^}]*\}|x[\s\S]{2}|u[\s\S]{4}|\r\n|[\s\S])/g, (match, escape, offset, body) => {
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
      });
  };
  const readNumber = () =>
    read(
      /0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[bB][01](?:_?[01])*|0[oO][0-7](?:_?[0-7])*|(?:(?:0|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|Infinity|NaN/y,
    );
  const toNumber = (token) => Number(token.replaceAll("_", ""));

  const readValue = () => {
    if (take("[")) {
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
      const value = {};
      while (!take("}")) {
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
      return { true: true, false: false, null: null, undefined: undefined }[literal];
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
