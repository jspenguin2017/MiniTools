# Repository guidance

Mini Tools is a static site in `docs/`, using plain HTML, CSS, and JavaScript modules with no build step. Use the
Node.js version in [package.json](package.json) and install dependencies with `npm ci`. Keep usage and input limits in
[README.md](README.md); keep development details here.

## Development checks

| Command                                   | Purpose                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev`                             | Serve `docs/` at `http://127.0.0.1:4173/`; refresh to see edits.                          |
| `npm test`                                | Run Vitest with jsdom and V8 coverage.                                                    |
| `npm run test:watch`                      | Rerun unit tests while editing.                                                           |
| `npm run format` / `npm run format:check` | Format / check the repository using a metadata cache.                                     |
| `npm run format:nocache`                  | Format without the cache.                                                                 |
| `npm run test:a11y`                       | Run Playwright accessibility checks.                                                      |
| `npm run verify`                          | Check formatting without the cache, then run unit tests with coverage and browser checks. |

[Vitest configuration](vitest.config.js) requires 100% line, branch, function, and statement coverage for
`docs/**/*.js`. The HTML report is generated at `coverage/index.html`.

Before running browser checks or `npm run verify`, install Chromium:

```sh
npx playwright install chromium
```

Alternatively, use installed Google Chrome with `PLAYWRIGHT_CHANNEL=chrome npm run test:a11y` (or
`PLAYWRIGHT_CHANNEL=chrome npm run verify`). Playwright starts its own server; stop `npm run dev` first to free
port 4173.

The [browser suite](test/browser/accessibility.spec.js) checks all three pages with axe-core, keyboard interactions,
contrast, responsive layouts, enlarged text, and forced colors. Automated checks do not replace manual screen-reader and
browser zoom testing.

## Implementation pitfalls

- **Module loading:** jsdom does not execute module scripts. Use [loadPage](test/helpers/load-page.js) to load the real
  markup and import scripts through Vitest; it resets the DOM and module state between tests.
- **DOM structure:** Tool scripts bind controls at import time.
  [createTextTransform](docs/FiltersToolkit/text-transform.js) selects direct children and relies on transform/copy
  button order. Preserve labels, descriptions, status regions, and keyboard access when changing markup.
- **Content Security Policy:** Pages use `default-src 'self'`; keep scripts and styles in local files and avoid inline
  handlers. Clipboard access can fail; preserve the manual-copy fallback and copy only the result, excluding warnings.
- **Domain handling:** URL parsing alone accepts some invalid hostnames. All three domain tools use
  [isValidDomain](docs/FiltersToolkit/validate-domain.js) for hostname labels, lengths, and IP validation. Validate URL
  hostnames before removing `www` prefixes. Merge and unmerge preserve case and spelling and compare exact trimmed
  strings. Unmerge tracks occurrence counts; replacing them with a set would lose duplicate-removal behavior.
- **Array parsing:** Keep input as literal data; do not use `eval` or `Function`. Object keys such as `__proto__` must
  remain data properties. Searches use the parsed array, while the textarea displays `JSON.stringify` output, which can
  lose information such as `undefined`, sparse slots, and non-finite numbers.
