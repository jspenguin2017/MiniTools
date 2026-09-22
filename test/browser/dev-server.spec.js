import { get } from "node:http";
import { expect, test } from "@playwright/test";

for (const path of ["//", "http://[invalid]/"]) {
  test(`malformed request target ${path} returns 400 and leaves the server running`, async ({ baseURL, request }) => {
    // Preserve the raw request target instead of letting a URL-based client normalize it.
    const response = await new Promise((resolve, reject) => {
      get(baseURL, { path, agent: false }, resolve).on("error", reject);
    });
    response.setEncoding("utf8");
    let body = "";
    for await (const chunk of response) body += chunk;

    expect(response.statusCode).toBe(400);
    expect(body).toBe("Bad request");

    const home = await request.get("/");
    expect(home.status()).toBe(200);
    expect(home.headers()["content-type"]).toBe("text/html");
    expect(await home.text()).toContain("<title>Mini Tools</title>");
  });
}

test("missing files still return 404", async ({ request }) => {
  const response = await request.get("/missing-dev-server-regression-file");
  expect(response.status()).toBe(404);
  expect(await response.text()).toBe("Not found");
});

for (const path of ["/FiltersToolkit", "/JavaScriptAnalyzer"]) {
  test(`${path} still redirects to its directory index`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(`${path}/`);
  });
}
