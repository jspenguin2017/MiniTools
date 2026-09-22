import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isValidDomain } from "../../docs/FiltersToolkit/validate-domain.js";

describe("isValidDomain", () => {
  for (const domain of [
    "a.b",
    "Example.COM",
    "sub.a-b.example",
    "123.example",
    "xn--bcher-kva.example",
    "192.0.2.1",
    "0.0.0.0",
    "255.255.255.255",
    "[::]",
    "[::1]",
    "[2001:DB8::1]",
    "[2001:db8:0:1:2:3:4:5]",
    "[::ffff:192.0.2.1]",
    `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`,
  ]) {
    it(`accepts ${domain}`, () => {
      assert.equal(isValidDomain(domain), true);
    });
  }

  for (const domain of [
    "",
    "localhost",
    "__proto__",
    "bad..example.com",
    ".example.com",
    "example.com.",
    "bad_name.example.com",
    "example.com)",
    "example.com,",
    "-example.com",
    "example-.com",
    "*.example.com",
    "~example.com",
    "bücher.example",
    "xn--.example",
    "example.123",
    "999.999.999.999",
    "192.0.2.256",
    "https://example.com",
    "//example.com",
    "example.com:443",
    "example.com/path",
    "example.com\\path",
    "example.com?query",
    "example.com#fragment",
    "user@example.com",
    "%65xample.com",
    "example.com ",
    " example.com",
    "example.com\n",
    "example.com\r",
    "example.com\t",
    "example.com\u0000",
    "foo bar.example",
    "foo\u00a0bar.example",
    "[]",
    "[localhost]",
    "[192.0.2.1]",
    "[2001:db8::1",
    "2001:db8::1]",
    "2001:db8::1",
    "[2001:db8:::1]",
    "[2001:db8::gg]",
    "[::ffff:999.0.2.1]",
    "[::1]:443",
    "[::1]/path/[::2]",
    "[::1]@[::2]",
    "[::1]\n",
    `${"a".repeat(64)}.example`,
    `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`,
  ]) {
    it(`rejects ${JSON.stringify(domain)}`, () => {
      assert.equal(isValidDomain(domain), false);
    });
  }
});
