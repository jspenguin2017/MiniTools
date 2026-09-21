# Code review: Filters Toolkit

## Scope and basis

- Reviewed `docs/FiltersToolkit/*.js`, its page markup, and the related usage contracts in `README.md` and `AGENTS.md`.
- Basis: commit `51cee5b649b6ccd059d58031451231349f02482d`, with a clean worktree before review.
- Review only; production files and tests were not modified. Third-party code, formatting, and individual test cases
  were excluded.

## Findings

### F1 — Validate extracted hostnames before returning them

- **Severity:** Medium
- **Location:** `docs/FiltersToolkit/links-to-domains.js:32–36`
- **Problem:** Successful URL parsing is treated as proof of a valid domain. The URL parser accepts hostname strings
  that this site's Merge Domains tool correctly rejects, including empty labels and underscores. Surrounding prose
  punctuation can also become part of the hostname because the candidate extends to the next whitespace.
- **Evidence:** Invoking the real page's transform handler in jsdom with `https://bad..example.com` and
  `https://bad_name.example.com` returns both names with zero warnings. `https://example.com)` returns `example.com)`
  with zero warnings. Passing the first two extracted names to Merge Domains produces invalid-entry warnings instead.
  The extraction outputs were also reproduced in Chrome 152.0.7977.64.
- **Impact:** Users can copy malformed filter domains from a tool that promises warnings for invalid links. Combining
  extraction with merging silently changes which domains survive unless the user inspects the later warnings.
- **Recommendation:** Validate the extracted hostname against an explicit supported hostname/IP contract before adding
  it to output, and warn when validation fails. Handle surrounding punctuation explicitly if extracting links embedded
  in prose is intended; preserve valid IPv6 and internationalized URL behavior where supported.

## Checks and coverage of review

- Traced extraction, trimming, sorting, exact deduplication, occurrence-based removal, Unicode UTF-16 escaping, status
  updates, and clipboard failure handling.
- Ran focused checks using the actual HTML and imported production modules under the installed jsdom. Confirmed
  malformed-host output, merge rejection, case-preserving deduplication, IPv4/Punycode handling, one-occurrence removal,
  supplementary-character escaping, and newline preservation.
- Confirmed output and warnings use `textContent`; copied content comes from the separate result buffer.
- The existing unit suite passed all 373 tests across 8 files; the existing browser suite passed all 16 checks.
  Individual test logic and coverage adequacy were not reviewed. Commands and environment are recorded in
  `CODE_REVIEW_DEVELOPMENT_TOOLING.md`.

## Unresolved questions

- The intended acceptance rules for Links to Domains are not specified as precisely as those for Merge Domains,
  especially for single-label hosts and IPv6. This does not affect the reproduced malformed-hostname finding.

## Material limits

- Clipboard permissions and manual-copy behavior were inspected statically; actual operating-system clipboard
  interaction was not exercised.
- No large-input stress test or legacy-browser compatibility matrix was run.
- Shared layout and accessibility are covered in `CODE_REVIEW_SITE_ACCESSIBILITY.md`; development/test infrastructure is
  covered in `CODE_REVIEW_DEVELOPMENT_TOOLING.md`.
