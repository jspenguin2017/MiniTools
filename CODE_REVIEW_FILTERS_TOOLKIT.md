# Code review: Filters Toolkit

## Scope and review basis

Reviewed all six files in `docs/FiltersToolkit/`, their DOM wiring, output/copy flow, and the corresponding behavior
described in `README.md`. Review basis: clean worktree at commit `f12e541421c1713b8ef47bf2b17abcac59a6e7b7`, reviewed on
September 9, 2026. Shared styles and project/test setup are covered in `CODE_REVIEW_SHARED_SITE_AND_TOOLING.md`.
Production files were not modified.

## Findings

### FT-1: Unmerge changes the surviving entries' order

- **Severity:** Medium
- **References:** `docs/FiltersToolkit/unmerge-domains.js:21–23,36–39`; documented contract at
  `docs/FiltersToolkit/index.html:49–51`.
- **Problem:** The implementation counts domains in a `Map`, then reconstructs and sorts the result. The page promises
  an unsorted result and removal of the first occurrence on each match. Sorting loses the original order; removing only
  the final `.sort()` would still group repeated domains and preserve their first insertion positions instead of the
  positions of the surviving occurrences.
- **Verified behavior:** Input `z.example,a.example,z.example,b.example\nz.example` produces
  `a.example,b.example,z.example`. Removing the first `z.example` should leave `a.example,z.example,b.example`. Input
  `z.example,b.example,a.example\nb.example` produces `a.example,z.example` instead of `z.example,a.example`.
- **Impact:** Using Unmerge as the documented ordered subtraction operation reorders unrelated entries, introducing
  unexpected changes when its output is pasted back into a filter list.
- **Recommendation:** Preserve the first line as an ordered sequence and consume removal counts while traversing it from
  left to right. Emit the surviving occurrences in their original order and do not sort the result.

### FT-2: Link extraction confuses URL authority text with the hostname

- **Severity:** Medium
- **References:** `docs/FiltersToolkit/links-to-domains.js:6,26–31`.
- **Problem:** The extraction regex takes characters up to the first colon or slash without parsing URL credentials or
  bracketed hosts. It also matches only lowercase HTTP schemes. Thus valid links can yield a username, a
  username-plus-host string, or a truncated IPv6 address, without an invalid-host warning.
- **Verified behavior:** Synthetic inputs `https://alice:password@example.com/path`, `https://alice@example.net/path`,
  and `https://[2001:db8::1]:8080/` produce `alice`, `alice@example.net`, and `[2001`, respectively. Node's built-in
  `URL(...).hostname` returns `example.com`, `example.net`, and `[2001:db8::1]`. `HTTPS://EXAMPLE.COM/path` produces a
  “No link” warning. These examples contain invented credentials only.
- **Impact:** Ordinary URL authority syntax produces invalid filter entries or targets the wrong host. Unsupported host
  types are silently emitted as corrupted text rather than rejected.
- **Recommendation:** Locate the first HTTP(S) URL without requiring a lowercase scheme, parse it using `URL`, then
  apply the intended hostname cleanup. Explicitly reject and warn about host forms the filter format cannot represent.

### FT-3: Merge's validation accepts malformed domain entries

- **Severity:** Medium
- **References:** `docs/FiltersToolkit/merge-domains.js:19–24`; documented contract at
  `docs/FiltersToolkit/index.html:36–38`.
- **Problem:** Validation only requires a nonempty string containing a dot. Full URLs, embedded whitespace, and empty
  domain labels pass this check despite the promised removal of invalid entries.
- **Verified behavior:** Input `https://example.com/a,foo bar.example,..\nvalid.example` produces
  `..,foo bar.example,https://example.com/a,valid.example` with no warnings.
- **Impact:** Merge presents malformed pasted entries as valid output, allowing invalid domain selectors to be copied
  into filter lists without the advertised diagnostics.
- **Recommendation:** Define the supported filter-domain syntax and validate against it, including any intentionally
  supported negation or wildcard notation. Reject URL components, whitespace, and invalid labels with the existing
  warning mechanism.

## Checks performed

- Read every production file in the segment and traced transform/copy event handlers to the shared text-transform
  helper.
- Loaded the real HTML in the existing jsdom dependency, imported the real production modules with Node, and clicked the
  real transform buttons for the reproductions above. The checks ran from an inline script and created no repository
  files.
- Confirmed a mixed ASCII, emoji, accented-letter, newline, and CJK input produces the expected UTF-16 Unicode escape
  sequences.
- Confirmed the rendering path uses `textContent` rather than interpreting pasted text as markup, and the copy buffer
  contains the transformation result separately from warnings.
- Did not inspect individual test cases, fixtures, or assertions, as required by the review scope. Suite execution and
  infrastructure checks are recorded in the shared tooling report.

## Unresolved questions

- The repository does not specify the complete domain-selector grammar it intends to support, such as negation,
  wildcards, internationalized names, or IP literals. FT-2 and FT-3 use concrete parsing/validation failures that do not
  depend on choosing a particular extended grammar.

## Material limitations

- No real-browser clipboard-permission, insecure-origin, or denial interaction was exercised. Clipboard writes are
  awaited without application-level error feedback in `text-transform.js:44–45`; the impact under actual supported
  deployment/browser combinations remains unverified.
- No large-input performance benchmark was run. This review does not establish a maximum supported input size or certify
  the segment as defect-free.

## Completion

This segment review is complete.
