# Mini Tools

Browser tools for preparing filter lists and inspecting JavaScript arrays. Input is processed in your browser.

[Open Mini Tools](https://jspenguin2017.github.io/MiniTools/) — no installation required.

## Features

### Filters Toolkit

Paste text, select **Transform**, then use **Copy Output** to copy the result without warnings.

- **Links to domains:** Extract the first HTTP(S) link's domain per line into a sorted, comma-separated list. Keep
  duplicates; warn about missing, invalid, or extra links.
- **Merge domains:** Combine comma-separated lists (one per line), sort, and remove invalid entries and exact duplicates
  after trimming, with warnings. Preserve spelling and case.
- **Unmerge domains:** Remove domains on subsequent lines from the first nonblank comma-separated list, one occurrence
  per match. Sort the remainder, preserving duplicates; warn about unmatched entries.
- **Unicode escape:** Convert non-ASCII characters to Unicode escape sequences.

Merge accepts ASCII hostnames with at least two dot-separated labels (including Punycode) and IPv4 addresses. URLs,
trailing dots, wildcards, and negation are unsupported.

### JavaScript Analyzer

**Unhex** decodes escaped strings in array literals into JSON and also accepts ordinary arrays. Paste the full array,
including square brackets, and select **Parse**:

- **Find Index:** Search string entries for a substring.
- **Find Value:** Look up a decimal integer index, starting at `0`; negative indices count from the end (`-1` is last).

Select **Parse** again after editing the array. Input is parsed as data; JavaScript expressions and statements are not
executed.

## Run locally

Use the Node.js version specified in [package.json](package.json):

```sh
git clone https://github.com/jspenguin2017/MiniTools.git
cd MiniTools
npm ci
npm run dev
```

Open [127.0.0.1:4173](http://127.0.0.1:4173/). Edit files in `docs/` and refresh; no build step is required.

Run `npm test` for unit tests. See [AGENTS.md](AGENTS.md) for development guidance, formatting, and browser test setup.

## License

[MIT](LICENSE).
