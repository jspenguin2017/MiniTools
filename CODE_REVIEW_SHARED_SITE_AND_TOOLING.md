# Code review: Shared site and tooling

## Scope and review basis

Reviewed `docs/index.html`, all of `docs/index.css`, `README.md`, `package.json`, `package-lock.json` dependency
metadata, `vitest.config.js`, `test/helpers/load-page.js`, `.gitignore`, `.prettierrc.json`, `.vscode/settings.json`,
`renovate.json`, and project metadata. Also checked the two application pages where they consume shared styles and load
production modules. Review basis: clean worktree at commit `f12e541421c1713b8ef47bf2b17abcac59a6e7b7`, reviewed on
September 9, 2026. Application logic is covered in the two other reports. Only review reports were written in the
workspace.

## Findings

### ST-1: Shared button colors and opacity produce insufficient text contrast

- **Severity:** Medium
- **References:** `docs/index.css:79–97,100–105,135–136`; representative affected controls at
  `docs/JavaScriptAnalyzer/index.html:27–34` and `docs/FiltersToolkit/index.html:30`.
- **Problem:** Enabled buttons render white text with `opacity: 0.7` over the light-gray container. This reduces the
  contrast of both button palettes. The analyzer's button text is small, and the green palette does not meet the
  ordinary-text threshold even at full opacity.
- **Verified behavior:** Chrome reports analyzer button text at approximately `13.33px`, weight `700`, foreground
  `rgb(255,255,255)`, opacity `0.7`, and blue/green backgrounds matching the stylesheet. Compositing over `#eeeeee` and
  applying the relative-luminance formula gives approximately `3.217:1` for blue and `2.674:1` for green. Both are below
  the `4.5:1` ordinary-text threshold. Green Copy Output buttons use `20px` bold text but still fall below the `3:1`
  large-text threshold in their normal state. These thresholds and the formula are documented by
  [W3C's explanation of WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Impact:** Users with reduced contrast perception can have difficulty reading the controls required to operate both
  tools.
- **Recommendation:** Choose foreground/background colors and normal, hover, and focus states that meet the applicable
  contrast threshold after compositing. Keep text fully opaque where practical; also darken or otherwise adjust the
  green palette because removing opacity alone yields only about `4.040:1` for its small white labels.

## Checks performed

- Checked the initially clean worktree and repository structure. No applicable `AGENTS.md` files were found in the
  repository or inspected ancestor locations.
- Read entry-point markup, relative navigation/module/style paths, CSP declarations, development instructions, toolchain
  constraints, npm scripts, formatter/editor settings, dependency manifests, and the shared jsdom page-loading helper.
  Formatting and individual test cases, fixtures, and assertions were not reviewed.
- Confirmed installed Node `v24.20.0` matches `package.json` and the lockfile; npm is `11.19.0`.
- Ran `npm ls --depth=0` and checked the full installed dependency tree using `npm ls --all --json`: both succeeded,
  with no reported dependency problems. All six direct dependency versions match the manifest and lockfile, and the
  manifest/lockfile root engine declarations match.
- Ran `npm audit --json` against the current registry advisory data. It succeeded and reported zero known
  vulnerabilities at review time; this is not a guarantee that the dependencies contain no security defects.
- Checked the referenced Renovate preset against its
  [current npm registry metadata](https://registry.npmjs.org/renovate-config-hugoxu/latest): `renovate-config-hugoxu`
  resolves successfully at `1.1.1` and contains a default preset. Renovate documents npm-hosted presets as deprecated
  but still supported, so deprecation alone was not reported as a broken workflow. See
  [Renovate's preset documentation](https://docs.renovatebot.com/config-presets/#npm-hosted-presets).
- Ran the existing suite without changing repository configuration:

  ```sh
  npm test -- --coverage.reportsDirectory=/tmp/minitools-code-review-20260909-coverage --no-cache --configLoader=native
  ```

  All four test files and all 296 tests passed. V8 reported 100% statements (`329/329`), branches (`191/191`), functions
  (`30/30`), and lines (`325/325`), satisfying the configured thresholds. Coverage output was redirected to `/tmp`,
  caching disabled, and native configuration loading used to avoid generated artifacts in the workspace. The recorded
  counts describe the existing suite execution; they do not establish correctness of all behavior.

- Used installed headless Chrome `152.0.7977.64` against unmodified files served over local HTTP. Verified production
  module execution under CSP, measured application layouts at desktop/narrow widths, and inspected computed button
  colors, opacity, font size, and accessible textbox names.
- Confirmed that placeholder text currently supplies textbox names in Chrome's accessibility tree; did not claim that
  these controls have no accessible name. The two domain-array textareas share the same placeholder, and no complete
  assistive-technology usability audit was performed.
- No verified defect was found in the inspected local dependency resolution or test infrastructure. This does not imply
  that those areas are defect-free.

## Unresolved questions

- The active hosting settings, Renovate service version, and bot execution logs are not stored in this repository. The
  external preset resolves, but an end-to-end Renovate run and effective configuration migration could not be verified
  with the installed tools.

## Material limitations

- Third-party package source and generated output were outside the review scope. The lockfile was examined for
  dependency metadata and consistency, rather than reviewing vendored implementation code.
- No dependencies were installed, updated, or repaired, and no formatting or snapshot-update commands were run.
- The normal `npm ci` fresh-install workflow was not executed because the skill prohibits dependency installation.
  Validation used the dependencies already present.
- Browser checks used headless Chrome on Linux. This was not a full accessibility, browser compatibility, or deployment
  audit.

## Completion

This segment review is complete.
