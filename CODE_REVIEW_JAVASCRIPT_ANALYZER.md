# Code review: JavaScript Analyzer

## Scope and basis

- Reviewed `docs/JavaScriptAnalyzer/parse-array.js`, `unhex.js`, their page/control contracts in `index.html`, and
  related documentation in `README.md` and `AGENTS.md`.
- Basis: commit `51cee5b649b6ccd059d58031451231349f02482d`, with a clean worktree before review.
- The original review did not modify production files or tests. Third-party code, formatting, and individual test cases
  were excluded. Locations and reproduction results below refer to the reviewed commit.

## Documentation disposition

- **A2 — Addressed by documenting limited support.** Unhex is intended for arrays of strings. Non-string entries may
  parse but are not fully supported. [README.md](README.md#javascript-analyzer) now describes the lossy lookup and JSON
  displays, and the [analyzer page](docs/JavaScriptAnalyzer/index.html) states the support boundary. The parser and
  lookup formatting remain unchanged; accepting a value does not promise a lossless display.
- **A1 — Retained as a documented limitation.** Invalid-index validation also affects arrays containing only strings, so
  the non-string support boundary does not resolve this finding. The README and page help now explain that an invalid or
  out-of-range index leaves the previous result and status unchanged. The README also notes that the inline error is not
  announced through the status region. The recommended behavior change is not implemented, as requested.

## Findings

### A1 — Clear stale results and announce failed index validation

- **Severity:** Medium
- **Location:** `docs/JavaScriptAnalyzer/unhex.js:91–104`; error markup at `docs/JavaScriptAnalyzer/index.html:49–55`
- **Problem:** Both index-validation failures return after setting the inline error, leaving the preceding result and
  success status intact. The error paragraph is not a live region, and focus remains on the submit button when that
  button is used.
- **Evidence:** In both jsdom and Chrome 152, parse `["first", {answer: 42}, ["a", "b"]]`, find index `0`, then submit
  `nope` or `90`. The result remains `first` and the status remains `Value found at index 0. The result is ready below.`
  The inline error changes, but a MutationObserver on the status records no update; button focus remains on
  `Find Value`.
- **Impact:** A failed lookup continues to display a successful earlier result. Screen-reader users submitting with the
  button also lack a status announcement or focus movement directing them to the newly displayed error. Actual
  screen-reader announcements were not tested.
- **Recommendation:** On each validation failure, clear/hide the preceding result and publish the failure through the
  existing status region, while retaining the field's `aria-invalid` and associated inline description. Alternatively,
  deliberately move focus to the invalid field and ensure the obsolete success is cleared.

### A2 — Preserve the contents of composite values in lookup results

- **Severity:** Low
- **Location:** `docs/JavaScriptAnalyzer/unhex.js:106–111`
- **Problem:** Assigning a parsed object or array directly to `textContent` applies JavaScript string coercion. JSON
  serialization is only attempted if that conversion throws, so ordinary objects become `[object Object]` and arrays
  lose their structure.
- **Evidence:** After parsing `["first", {answer: 42}, ["a", "b"]]`, Find Value at index `1` displays `[object Object]`;
  index `2` displays `a,b`. These results were reproduced in jsdom and Chrome 152.
- **Impact:** The parser supports nested data, but lookup cannot show an ordinary object's fields, and distinct nested
  array values can produce indistinguishable text. Users must locate the value manually in the entire decoded array.
- **Recommendation:** Choose formatting by value type: preserve raw string output, and serialize composite values
  explicitly instead of relying on a failed coercion to trigger serialization. Account for the parser's documented
  non-JSON values when choosing the representation.

## Checks and coverage of review

- Traced the tokenizer and recursive parser through comments, string/hex/Unicode escapes, numeric forms, sparse arrays,
  nested objects, signs, terminal tokens, and malformed-input rejection.
- Checked identifier allowlisting and data-property creation for keys such as `__proto__`; parsed input is not executed,
  and results are written with `textContent`.
- Traced parse/reset, JSON presentation, substring lookup, integer/negative-index validation, error recovery, and result
  formatting.
- Reproduced both findings using the real markup and production modules, then confirmed them in installed Google Chrome
  152.0.7977.64 via Playwright. No page errors occurred in these browser reproductions.
- The existing unit suite passed: 8 files, 373 tests, with all configured coverage thresholds satisfied. The existing
  browser suite passed all 16 checks. Test implementations and coverage adequacy were not reviewed.

## Unresolved questions

- No additional unresolved candidate defect is asserted. The non-string support boundary and possible information loss
  are now explicit in the README and UI. `AGENTS.md` also documents that the JSON textarea can lose `undefined`, holes,
  and non-finite values while searches retain parsed data. A1 remains a known limitation as described above.

## Material limits

- No manual screen-reader session, large-input stress test, or cross-browser compatibility matrix was run.
- The recursive parser and JSON serialization were inspected, but no maximum safe input size or nesting depth was
  established.
- Shared styling and page structure are covered in `CODE_REVIEW_SITE_ACCESSIBILITY.md`; test infrastructure is covered
  in `CODE_REVIEW_DEVELOPMENT_TOOLING.md`.
