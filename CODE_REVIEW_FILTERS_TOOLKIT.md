# Code review: Filters Toolkit

## Scope and review basis

Reviewed all six files in `docs/FiltersToolkit/`, their DOM wiring, output/copy flow, and the corresponding behavior
described in `README.md`. Review basis: clean worktree at commit `f12e541421c1713b8ef47bf2b17abcac59a6e7b7`, reviewed on
September 9, 2026. Shared styles and project/test setup are covered in `CODE_REVIEW_SHARED_SITE_AND_TOOLING.md`.
Production files were not modified.

## Findings

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
