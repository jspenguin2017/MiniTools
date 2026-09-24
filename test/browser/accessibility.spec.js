import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** @param {import('@playwright/test').Page} page */
async function audit(page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

/** @param {import('@playwright/test').Page} page */
async function expectReflow(page) {
  const overflow = await page.evaluate(() => {
    return [...document.querySelectorAll("body, main, section, form, input, textarea, button, pre")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < 0 || rect.right > innerWidth + 1);
      })
      .map((element) => element.outerHTML.slice(0, 150));
  });
  expect(overflow).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

/** @param {import('@playwright/test').Page} page */
async function skipToMain(page) {
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
}

for (const width of [320, 1280]) {
  for (const path of ["/", "/FiltersToolkit/", "/JavaScriptAnalyzer/"]) {
    test(`${path} has accessible landmarks, names and contrast at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await audit(page);
      await expectReflow(page);
      await skipToMain(page);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      for (const field of await page.getByRole("textbox").all()) {
        await expect(field).toHaveAccessibleName(/\S/);
        await expect(field).toHaveAccessibleDescription(/\S/);
        expect(await field.evaluate((input) => input.labels.length)).toBe(1);
      }
    });
  }
}

test("every transform can be run, copied and read using only the keyboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/FiltersToolkit/");
  await skipToMain(page);
  await page.keyboard.press("Tab");

  for (const [id, name, input, output] of [
    ["links-to-domains", "Links", "https://example.com\ninvalid", "example.com"],
    ["merge-domains", "Domain lists to merge", "example.com\nexample.com", "example.com"],
    ["unmerge-domains", "Domain lists to unmerge", "example.com,example.org\nexample.org", "example.com"],
    ["unicode-escape", "Text", "é", "\\u00E9"],
  ]) {
    const section = page.locator(`#${id}`);
    await expect(page.getByRole("textbox", { name, exact: true })).toBeFocused();
    await page.keyboard.insertText(input);
    await page.keyboard.press("Tab");
    const transform = section.getByRole("button", { name: /^Transform/ });
    await expect(transform).toBeFocused();
    await expect(transform).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(transform).toBeFocused();
    await expect(section.getByRole("status")).toContainText("Transformation complete.");
    await page.keyboard.press("Tab");
    await expect(section.getByRole("button", { name: /^Copy Output/ })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(section.getByRole("status")).toHaveText("Output copied to clipboard.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(output);
    await page.keyboard.press("Tab");
    await expect(section.locator("pre")).toBeFocused();
    await expect(section.locator("pre")).toHaveAccessibleName(/output/);
    await page.keyboard.press("Tab");
  }
  await audit(page);
  await expectReflow(page);
});

for (const clipboard of ["denied", "unavailable"]) {
  test(`copy ${clipboard} gives an accessible fallback and preserves output`, async ({ page }) => {
    await page.addInitScript((state) => {
      Object.defineProperty(navigator, "clipboard", {
        value:
          state === "unavailable"
            ? undefined
            : {
                writeText: async () => {
                  throw new DOMException("Denied", "NotAllowedError");
                },
              },
      });
    }, clipboard);
    await page.goto("/FiltersToolkit/");
    const section = page.locator("#unicode-escape");
    await section.getByRole("textbox").fill("é");
    await section.getByRole("button", { name: /^Transform/ }).click();
    const copy = section.getByRole("button", { name: /^Copy Output/ });
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(section.getByRole("status")).toHaveText(
      "Could not copy output. Select the output below and copy it manually.",
    );
    await expect(copy).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(section.locator("pre")).toBeFocused();
    await expect(section.locator("pre")).toHaveText("Output:\n\\u00E9");
    await audit(page);
  });
}

test("analyzer supports keyboard submission, readable results and validation recovery", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/JavaScriptAnalyzer/");
  await skipToMain(page);
  await page.keyboard.press("Tab");
  const source = page.getByRole("textbox", { name: "JavaScript array" });
  const value = page.getByRole("textbox", { name: "Search text" });
  const index = page.getByRole("textbox", { name: "Index", exact: true });
  const indexError = page.getByRole("alert");
  const findValue = page.getByRole("button", { name: "Find Value", exact: true });
  const status = page.getByRole("status");
  const output = page.getByRole("region", { name: "JavaScript Analyzer results" });
  await expect(source).toBeFocused();
  await page.keyboard.insertText('["first", "second", ""]');
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(status).toContainText("Input successfully parsed.");
  await page.keyboard.press("Tab");
  await expect(value).toBeFocused();
  await page.keyboard.insertText("s");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Matching string values: 2. Results are ready below.");
  await expect(value).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(output).toHaveText("0:first\n1:second");
  await page.keyboard.press("Tab");
  await expect(index).toBeFocused();
  await page.keyboard.insertText("bad");
  await page.keyboard.press("Enter");
  await expect(index).toBeFocused();
  await expect(index).toHaveAttribute("aria-invalid", "true");
  await expect(index).toHaveAccessibleDescription(/Enter an integer/);
  await expect(indexError).toHaveText("Enter an integer, for example 0 or -1.");
  await expect(status).toHaveText("Matching string values: 2. Results are ready below.");
  await expect(output).toHaveText("0:first\n1:second");
  await expect(output).toBeVisible();
  for (const invalidIndex of ["bad", "3", "-4"]) {
    await index.fill(invalidIndex);
    await expect(indexError).toBeEmpty();
    await page.keyboard.press("Tab");
    await expect(findValue).toBeFocused();
    await page.keyboard.press("Space");
    await expect(findValue).toBeFocused();
    await expect(index).toHaveAttribute("aria-invalid", "true");
    const message = invalidIndex === "bad" ? "Enter an integer, for example 0 or -1." : "Use an index from -3 to 2.";
    await expect(indexError).toHaveText(message);
    await expect(index).toHaveAccessibleDescription(new RegExp(message.replaceAll(".", "\\.")));
    await expect(status).toHaveText("Matching string values: 2. Results are ready below.");
    await expect(output).toHaveText("0:first\n1:second");
    await expect(output).toBeVisible();
  }
  await audit(page);
  await index.fill("1");
  await expect(index).not.toHaveAttribute("aria-invalid");
  await expect(indexError).toBeEmpty();
  await page.keyboard.press("Enter");
  await expect(output).toHaveText("second");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Find Value", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(output).toBeFocused();
  await index.fill("-1");
  await page.keyboard.press("Enter");
  await expect(status).toContainText("The value has no text representation.");
  await value.fill("missing");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("No matching string values found.");
  await source.fill("[");
  await page.getByRole("button", { name: "Parse", exact: true }).click();
  await expect(source).toHaveAttribute("aria-invalid", "true");
  await expect(source).toHaveAccessibleDescription(/Enter a complete array literal/);
  await expect(status).toContainText("Could not parse input.");
  await audit(page);
  await source.fill("[]");
  await expect(source).not.toHaveAttribute("aria-invalid");
  await page.getByRole("button", { name: "Parse", exact: true }).click();
  await expect(source).toHaveAttribute("aria-invalid", "true");
  await expect(source).toHaveAccessibleDescription(/The array is empty/);
  await expect(status).toHaveText("The array is empty. Add a value and select Parse.");
  for (const name of ["Find Index", "Find Value"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(status).toHaveText("Parse a nonempty array before searching.");
    await expect(output).toBeHidden();
  }
  await audit(page);
  await source.fill('["recovered"]');
  await expect(source).not.toHaveAttribute("aria-invalid");
  await page.getByRole("button", { name: "Parse", exact: true }).click();
  await expect(status).toContainText("Input successfully parsed.");
  await index.fill("0");
  await page.keyboard.press("Enter");
  await expect(output).toHaveText("recovered");
  await expectReflow(page);
});

/** Contrast ratio of two opaque computed CSS rgb colors. */
function contrast(first, second) {
  const luminance = (color) => {
    const channels = color
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const path of ["/FiltersToolkit/", "/JavaScriptAnalyzer/"]) {
  test(`${path} buttons meet contrast in every interaction state`, async ({ page }, testInfo) => {
    await page.goto(path);
    if (path === "/FiltersToolkit/") {
      await page.getByRole("button", { name: "Transform links to domains", exact: true }).click();
    }
    const measurements = [];
    for (const palette of ["blue", "green"]) {
      const button = page.locator(`button.${palette}`).first();
      for (const state of ["normal", "hover", "focus", "active"]) {
        await page.mouse.move(0, 0);
        await button.evaluate((element) => element.blur());
        if (state === "hover" || state === "active") await button.hover();
        if (state === "focus") {
          await page.keyboard.press("Tab");
          await button.focus();
          await expect(button).toHaveCSS("outline-style", "solid");
          await expect(button).toHaveCSS("outline-width", "3px");
        }
        if (state === "active") await page.mouse.down();
        const styles = await button.evaluate((element) => {
          const style = getComputedStyle(element);
          let opaque = true;
          for (let parent = element; parent; parent = parent.parentElement) {
            opaque &&= getComputedStyle(parent).opacity === "1";
          }
          return {
            foreground: style.color,
            background: style.backgroundColor,
            outline: style.outlineColor,
            surrounding: getComputedStyle(element.closest(".container")).backgroundColor,
            height: element.getBoundingClientRect().height,
            opaque,
          };
        });
        const ratio = contrast(styles.foreground, styles.background);
        measurements.push({ palette, state, ratio });
        expect(styles.opaque).toBe(true);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(contrast(styles.background, styles.surrounding)).toBeGreaterThanOrEqual(3);
        expect(styles.height).toBeGreaterThanOrEqual(44);
        if (state === "focus") expect(contrast(styles.outline, styles.surrounding)).toBeGreaterThanOrEqual(3);
        if (state === "active") await page.mouse.up();
      }
    }
    await testInfo.attach("button-contrast", {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });
  });
}

for (const path of ["/", "/FiltersToolkit/", "/JavaScriptAnalyzer/"]) {
  test(`${path} reflows long content with enlarged and spaced text`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    if (path === "/FiltersToolkit/") {
      for (const section of await page.locator("main section").all()) {
        await section.getByRole("textbox").fill(("https://" + "a".repeat(150) + ".example/path\n").repeat(5));
        await section.getByRole("button", { name: /^Transform/ }).click();
      }
    } else if (path === "/JavaScriptAnalyzer/") {
      await page.getByRole("textbox", { name: "JavaScript array" }).fill(JSON.stringify(["a".repeat(1000)]));
      await page.getByRole("button", { name: "Parse", exact: true }).click();
      await page.getByRole("textbox", { name: "Search text" }).fill("a");
      await page.getByRole("button", { name: "Find Index", exact: true }).click();
    }
    await expectReflow(page);
    await page.evaluate(() => {
      // Adjust the existing sheet: inline style injection would bypass the site's CSP.
      const sheet = document.styleSheets[0];
      sheet.insertRule("html { font-size: 200%; }", sheet.cssRules.length);
      sheet.insertRule(
        "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }",
        sheet.cssRules.length,
      );
      sheet.insertRule("p { margin-bottom: 2em !important; }", sheet.cssRules.length);
    });
    await expectReflow(page);
    for (const button of await page.getByRole("button").all()) {
      expect(await button.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
    }
    await audit(page);
  });
}

test("forced colors retain visible fields and keyboard focus", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/JavaScriptAnalyzer/");
  await skipToMain(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "JavaScript array" })).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  const parse = page.getByRole("button", { name: "Parse", exact: true });
  await expect(parse).toBeFocused();
  await expect(parse).toHaveCSS("outline-width", "3px");
  await expect(parse).toHaveCSS("border-top-style", "solid");
  const colors = await parse.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.borderTopColor, style.backgroundColor];
  });
  expect(colors[0]).not.toBe(colors[1]);
});
