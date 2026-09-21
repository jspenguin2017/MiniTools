# Code review: Development tooling and test infrastructure

## Scope and basis

- Reviewed `package.json`, `package-lock.json`, `scripts/serve-docs.js`, `vitest.config.js`, `playwright.config.js`,
  `test/helpers/*.js`, `.gitignore`, `.prettierrc.json`, `.vscode/settings.json`, and development/setup documentation in
  `README.md` and `AGENTS.md`.
- Inspected the tracked-file inventory for additional build/deployment/CI configuration; none was present. The project
  is a static site without a build step.
- Basis: commit `51cee5b649b6ccd059d58031451231349f02482d`, with a clean worktree before review.
- Review only; production files, configuration, dependency installations, and tests were not modified. Third-party
  source, generated output, formatting, and individual test cases were excluded.

## Findings

### D1 — Handle request-URL parsing errors inside the server's error boundary

- **Severity:** Low
- **Location:** `scripts/serve-docs.js:8–15`
- **Problem:** Both URL constructions occur before the `try` block. A request target such as `//` makes the first
  `new URL()` throw. Because the HTTP listener is async and its rejected promise is not handled, the configured Node
  runtime exits instead of returning an error response.
- **Evidence:** Started the unchanged server with Node 24.21.0, then sent
  `http.request({ hostname: '127.0.0.1', port: 4173, path: '//' })`. The client received `ECONNRESET`; the server exited
  with code `1` and `ERR_INVALID_URL` at line 9. The double-slash target is treated as an invalid protocol-relative URL
  by the URL constructor.
- **Impact:** One malformed request stops the local development server and requires a restart. The same server supports
  Playwright's `webServer` configuration. Scope is limited to local development/browser checks: it listens on loopback
  and is not the GitHub Pages production server.
- **Recommendation:** Put request-target parsing and file-URL construction within an error boundary and respond to
  malformed request targets with a controlled HTTP error. Ensure no rejected promise from the request listener escapes
  the handler.

## Checks and coverage of review

- Verified the active Node version is `v24.21.0`, matching the manifest; npm is `11.19.0`.
- Compared root dependency versions, project version, and Node engine between the manifest and lockfile: they agree.
  Reviewed the lockfile's Node-engine ranges against the active runtime; all allow Node 24.21.0. Locked tarballs
  reference `https://registry.npmjs.org`.
- `npm ls --depth=0` reported the requested direct dependencies; `npm ls --all --json` completed successfully with no
  dependency-tree problems.
- Inspected static-file routing, directory redirects, root containment, content types, error handling, loopback binding,
  and the fixed port's agreement with Playwright and documentation.
- Inspected Vitest inclusion/environment/coverage configuration, Playwright server/browser configuration, test-helper
  module reset/import behavior, and teardown. Individual test cases, fixture data, assertions, and coverage adequacy
  were not reviewed.
- Executed the existing unit suite with generated coverage directed outside the workspace and cache writing disabled:

  ```sh
  node node_modules/vitest/vitest.mjs run --coverage --coverage.reportsDirectory=/tmp/minitools-review-coverage --no-cache --configLoader=runner
  ```

  Result: **8 files and 373 tests passed**; all configured coverage thresholds passed. The config-loader override avoids
  a temporary bundled config in the repository, so the default bundled-config loading path was not independently
  exercised.

- Executed the existing browser suite using the documented installed-Chrome alternative:

  ```sh
  PLAYWRIGHT_CHANNEL=chrome npm run test:a11y -- --output=/tmp/minitools-review-playwright --reporter=line
  ```

  Result: **16 checks passed**. The managed Playwright Chromium binary was absent, while installed Chrome 152.0.7977.64
  was available. No browser or dependency installation was performed.

- An initial optional manifest-check script attempted to import `semver`, which is not an installed project dependency.
  That script was replaced with direct manifest/lock comparisons and inspection of the recorded engine ranges; no
  dependency was added. This is a review-script limitation, not a project defect.
- Reproduced D1 against a server process created solely for the review; it exited as reported. Review-created
  browser/server processes were closed afterward.

## Unresolved questions

- None beyond the unverified environments and external configuration listed below.

## Material limits

- No fresh `npm ci`, dependency upgrade, registry advisory audit, or dependency-source audit was performed. Existing
  installed dependencies were used, as required by the review skill.
- The default managed-Chromium path, alternate operating systems, and external hosting/deployment settings were not
  exercised.
- Formatter checks and `npm run verify` were intentionally omitted because formatting is outside this review's scope;
  unit and browser checks were run directly.
