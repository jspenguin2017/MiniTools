import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const root = new URL("../docs/", import.meta.url);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://127.0.0.1");
  if (["/FiltersToolkit", "/JavaScriptAnalyzer"].includes(pathname)) {
    response.writeHead(308, { Location: pathname + "/" }).end();
    return;
  }
  const file = new URL("." + pathname + (pathname.endsWith("/") ? "index.html" : ""), root);
  try {
    if (!file.href.startsWith(root.href)) throw new Error("Outside site root");
    const content = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file.pathname)] ?? "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(4173, "127.0.0.1", () => {
  console.log("Serving docs at http://127.0.0.1:4173/");
});
