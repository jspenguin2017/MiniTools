# Code review: JavaScript Analyzer

## Scope and review basis

Reviewed `docs/JavaScriptAnalyzer/index.html`, `index.css`, `unhex.js`, and the complete tokenizer/parser in
`parse-array.js`, together with their documented behavior in `README.md`. Review basis: clean worktree at commit
`f12e541421c1713b8ef47bf2b17abcac59a6e7b7`, reviewed on September 9, 2026. Shared site styles and project/test setup are
covered separately. Production files were not modified.

## Findings

### JA-1: Successful parsing overwrites supported values with a lossy representation

- **Severity:** Medium
- **References:** `docs/JavaScriptAnalyzer/unhex.js:14–18`; supported value contract at
  `docs/JavaScriptAnalyzer/parse-array.js:2–13,300–316,380–382`.
- **Problem:** The parser deliberately preserves sparse slots, `undefined`, `NaN`, infinities, and negative zero, but
  the Parse handler immediately replaces the source textarea with `JSON.stringify(unHexData)`. JSON cannot faithfully
  represent those values, so the visible array differs from the data searched in memory. A second Parse reads this
  altered representation and replaces the original values permanently within the page.
- **Verified behavior:** Parsing `[undefined, NaN, Infinity, -Infinity, -0, , {a: undefined}]` rewrites the textarea to
  `[null,null,null,null,0,null,{}]` and reports success. Find Value at index `2` initially displays `Infinity`. Clicking
  Parse again and repeating the lookup displays empty text because that element is now `null`.
- **Impact:** Users copying the displayed result lose supported data without a warning, and the same visible input gives
  different lookup results before and after a second Parse.
- **Recommendation:** Preserve the original input and display JSON separately with a warning when conversion is lossy,
  or use a literal serializer that retains every supported value and sparse slot. Ensure the editable representation and
  lookup data cannot silently diverge.

## Checks performed

- Read the complete tokenizer and parser, including comments, number formats/separators, Unicode and string escapes,
  comments, array holes, object properties, signed values, and full-input consumption.
- Used the existing jsdom dependency to load the real HTML, import `unhex.js`, and trigger the Parse and Find Value
  buttons for the findings above. These inline checks did not create repository files.
- Directly checked mixed hexadecimal/Unicode string escapes, multiple numeric bases, numeric separators, sparse arrays,
  and object keys such as `__proto__` and `constructor`. The prototype probe did not mutate `Object.prototype`.
- Confirmed rejection of representative global identifiers, function calls, getter syntax, and trailing JavaScript
  statements. The inspected implementation parses data without an execution primitive and renders output through
  `textContent`.
- The explicit handling of `__proto__` as a data property is an intentional, documented safety choice and is not
  reported as a defect.
- Served the unmodified production files over local HTTP and used installed Chrome `152.0.7977.64` through its debugging
  protocol to verify module loading under the page's CSP and successful decoding of `["\\x41","B"]` to `["A","B"]`.
- Measured the actual control bounds at viewport widths of `1280`, `600`, `375`, and `320` CSS pixels. Shared button
  contrast is covered in `CODE_REVIEW_SHARED_SITE_AND_TOOLING.md`.
- Individual test cases, fixture data, and assertions were not reviewed. Suite execution is recorded in the shared
  tooling report.

## Unresolved questions

- The user documentation does not define the complete supported literal grammar. Unsupported constructs outside the
  documented value type were not assumed to be defects solely because they are valid in general JavaScript.

## Material limitations

- Parser checks are focused behavioral probes, not an exhaustive language-conformance or fuzzing campaign.
- No large-input or maximum-nesting benchmark was run. Parsing and searching execute synchronously in the page.
- Browser checks used headless Chrome on Linux; Safari, Firefox, physical mobile devices, and a screen reader were not
  exercised.

## Completion

This segment review is complete.
