# Mini Tools

Various mini tools

Please open an issue if there is something you want me to know.

### [Open](https://jspenguin2017.github.io/MiniTools/)

### Development

Use the Node.js version specified in `package.json`, then run `npm ci` to install development dependencies.

- `npm test` runs the tests in `test/` and requires 100% line, branch, and function coverage for the JavaScript in
  `docs/`.
- `npm run format` formats the repository with Prettier.

Tests use Node's built-in test runner and jsdom to load the actual HTML and JavaScript, click controls, and check the
results. The test runner uses Node's experimental VM modules to execute browser modules in isolated jsdom windows.
Clipboard copying is simulated because jsdom has no system clipboard. Array literal parsing and rejection of executable
input are covered.

The source in `docs/` uses ES modules, runs directly in a browser over HTTP, and requires no build step. Tests capture
the current behavior, including Unmerge sorting its output (despite the page's description) and Find Value accepting
integer prefixes through `parseInt()`.

jsdom is pinned to 30.0.1, published on July 29, 2026: the latest stable release at least seven days old when selected
on September 8, 2026. Installation used the same seven-day cutoff for transitive dependencies.
