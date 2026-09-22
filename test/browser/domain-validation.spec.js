import { expect, test } from "@playwright/test";

test("domain tools reject F1 hostnames and share valid output through the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/FiltersToolkit/");
  const malformed = ["bad..example.com", "bad_name.example.com", "example.com)"];
  const extracted = "192.0.2.1,[2001:db8::1],xn--bcher-kva.example";
  let copied = "";

  for (const id of ["links-to-domains", "merge-domains", "unmerge-domains"]) {
    const section = page.locator(`#${id}`);
    let input;
    let expected;
    let warnings;
    if (id === "links-to-domains") {
      input = [
        ...malformed.map((domain) => "https://" + domain),
        "https://www.bücher.example/path",
        "http://192.0.2.1:8080/",
        "https://[2001:DB8::1]:443/",
      ].join("\n");
      expected = extracted;
      warnings = malformed.map((domain) => `Invalid link "https://${domain}"`);
    } else {
      input = `${copied},${malformed[0]}\n${malformed.slice(1).join(",")}`;
      expected = extracted;
      warnings = malformed.map((domain) => `Invalid entry "${domain}"`);
      if (id === "unmerge-domains") {
        input += ",192.0.2.1";
        expected = "[2001:db8::1],xn--bcher-kva.example";
      }
    }
    await section.getByRole("textbox").fill(input);
    await section.getByRole("button", { name: /^Transform/ }).click();
    await expect(section.locator("pre")).toHaveText(`Warnings:\n${warnings.join("\n")}\n\nOutput:\n${expected}`);
    await expect(section.getByRole("status")).toHaveText(
      "Transformation complete. Warnings: 3. Output is ready below.",
    );
    await section.getByRole("button", { name: /^Copy Output/ }).click();
    await expect(section.getByRole("status")).toHaveText("Output copied to clipboard.");
    copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(expected);
  }
});
