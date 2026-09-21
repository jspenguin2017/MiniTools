# Accessibility audit and fixes

Reviewed and updated the home page, all four Filters Toolkit transformations, JavaScript Analyzer, shared styles, and
dynamic feedback. This audit uses [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) as its reference. Automated checks and
browser inspection do not establish full conformance.

## Findings addressed

| Area                          | Finding and fix                                                                                                                                                                                                                                                                                                        | Relevant WCAG criteria                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Button contrast (ST-1)        | Removed opacity from every button state, darkened the green palette, and provided darker hover and active colors.                                                                                                                                                                                                      | 1.4.3, 1.4.11                                                               |
| Keyboard focus                | Replaced suppressed button outlines with a visible, offset outline on links, buttons, fields, and results; retained outlines and button boundaries in forced colors.                                                                                                                                                   | 2.4.7, 2.4.11                                                               |
| Field names and instructions  | Replaced placeholder-only prompts with persistent labels and associated instructions. Merge and unmerge inputs now have distinct names; repeated transform/copy buttons include their tool in their accessible names.                                                                                                  | 1.3.1, 2.4.6, 2.5.3, 3.3.2                                                  |
| Field visibility              | Added contrasting input borders, explicit text/background colors, and readable base control text.                                                                                                                                                                                                                      | 1.4.3, 1.4.11                                                               |
| Page navigation               | Added header, navigation, main, footer, and named tool sections, plus a keyboard-visible skip link. Preserved the heading hierarchy. External links follow the normal browser navigation behavior instead of forcing a new tab.                                                                                        | 1.3.1, 2.4.1; predictable navigation is an additional usability improvement |
| Responsive layout (also JA-3) | Replaced the analyzer's fixed percentage grid with full-width fields that stack below 900px. Wrapped long text/results, used border-box sizing, and replaced fixed button heights with minimum heights.                                                                                                                | 1.4.4, 1.4.10, 1.4.12                                                       |
| Target size                   | Buttons and single-line inputs have a minimum height of 44 CSS pixels. Controls can grow with their content.                                                                                                                                                                                                           | 2.5.8                                                                       |
| Result announcements          | Added persistent, polite, atomic status regions for transformation/warning summaries, parsing, searches, empty results, and clipboard operations. Full result data remains outside live regions to avoid excessively long announcements.                                                                               | 4.1.3                                                                       |
| Errors and recovery           | Associated parse and index errors with their fields, exposed invalid states, supplied correction instructions, and cleared obsolete validation errors when fields are edited or successfully checked. Clipboard failures now provide visible and announced manual-copy instructions while preserving input and output. | 3.3.1, 3.3.3, 4.1.3                                                         |
| Keyboard operation            | Native search forms submit with Enter; all actions retain normal Tab/Enter/Space behavior. Visible output regions can receive keyboard focus, empty result regions are hidden, and operations preserve focus.                                                                                                          | 2.1.1, 2.4.3                                                                |

## Contrast measurements

White button text is fully opaque. Browser tests check the computed styles and every ancestor's opacity in normal,
hover, focus, and active states. The normal palette also applies during keyboard focus.

| Palette | Normal/focus        | Hover               | Active               |
| ------- | ------------------- | ------------------- | -------------------- |
| Blue    | 5.671:1 (`#2463c9`) | 8.114:1 (`#1b4d9c`) | 10.718:1 (`#153c7a`) |
| Green   | 5.520:1 (`#007a20`) | 7.709:1 (`#006119`) | 10.137:1 (`#004d14`) |

All button text exceeds the ordinary-text minimum of 4.5:1, including the smaller analyzer controls. Button backgrounds
exceed 3:1 against their `#eeeeee` surroundings. Field borders (`#666666`) contrast at 4.949:1 against those
surroundings. Thresholds and calculation follow
[W3C's contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and
[non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## Verification

- All 343 Vitest tests pass with 100% statement, branch, function, and line coverage for production JavaScript.
- All 16 Playwright tests pass in headless Google Chrome 152.0.7977.64 on Linux. axe-core reports zero violations in the
  tested initial, populated, error, clipboard-failure, and enlarged-text states. The suite uses all default axe rules
  rather than filtering out best-practice checks.
- Keyboard tests traverse all four transformations through input, Transform, Copy Output, and results. Clipboard success
  uses the browser's real clipboard API; denied and unavailable APIs are simulated. Analyzer tests exercise Enter
  submission, Space activation, error recovery, successful searches, and empty results.
- Measured all three pages at 320, 375, 600, 900, and 1280 CSS pixels without page-level horizontal overflow. At 320px,
  both analyzer search fields are 300px wide (the earlier JA-3 report measured the index field at only 8px).
- Reflow tests exercise long inputs/results at 320px and repeat with a 200% root font size, 1.5 line height, 0.12em
  letter spacing, 0.16em word spacing, and 2em paragraph spacing. This checks the narrow viewport used for reflow and
  additional text enlargement; it does not simulate every browser's zoom implementation.
- Inspected desktop and narrow screenshots. Inspected Chrome's accessibility tree for field names/descriptions,
  validation state, and polite/atomic status properties. Forced-colors tests check visible focus and button boundaries.

Run `npm test` and `npm run test:a11y` as described in [README.md](README.md). The recorded run used installed Node
24.20.0; the repository requests 24.21.0. No production runtime dependencies were added.

## Manual testing limits

Screen-reader speech output and usability with NVDA, JAWS, VoiceOver, or TalkBack have not been tested. Safari, Firefox,
physical mobile devices, and operating-system magnifiers were not exercised. In particular, repeated live-region
announcements should be checked with real assistive technology. These are validation limits, not claims of known
remaining defects. Third-party sites linked from the app are outside this audit.

For a manual assistive-technology pass, visit each page, use the skip link and headings/landmarks, complete every tool
with the keyboard, and confirm concise announcements for success, warnings, repeated actions, errors, and recovery.
Check 200% text enlargement, 400% browser zoom, and the operating system's high-contrast settings.
