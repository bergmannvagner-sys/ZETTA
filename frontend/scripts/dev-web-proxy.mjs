import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { readFile, stat } from "node:fs/promises";

const distDir = resolve(process.cwd(), "dist");
const renderBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/u, "");
const port = Number(process.env.PORT ?? "8081");

if (!renderBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is required for the web proxy server.");
}

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".map", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function getContentType(filePath) {
  return mimeTypes.get(extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function safeDistPath(urlPath) {
  const cleaned = normalize(urlPath).replace(/^(\.\.(?:[\\/]|$))+/, "");
  return join(distDir, cleaned);
}

async function serveStatic(requestPath, response) {
  const candidatePath = safeDistPath(requestPath === "/" ? "/index.html" : requestPath);
  let filePath = candidatePath;

  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      filePath = join(filePath, "index.html");
    }
  } catch {
    filePath = join(distDir, "index.html");
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": getContentType(filePath) });
    response.end(body);
  } catch {
    const body = await readFile(join(distDir, "index.html"));
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(body);
  }
}

async function proxyToRender(request, response, requestPath) {
  const upstreamPath = requestPath.replace(/^\/api\/render/u, "");
  const targetUrl = `${renderBaseUrl}${upstreamPath}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (!value) {
      continue;
    }
    const lower = key.toLowerCase();
    if (["host", "connection", "content-length", "expect"].includes(lower)) {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(",") : value);
  }

  const init = {
    headers,
    method: request.method
  };

  if (request.method && request.method !== "GET" && request.method !== "HEAD") {
    init.body = await new Promise((resolveBody, rejectBody) => {
      const chunks = [];
      request.setEncoding("utf8");
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => resolveBody(chunks.join("")));
      request.on("error", rejectBody);
    });
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (error) {
    console.error("Proxy fetch failed", targetUrl, error);
    throw error;
  }

  const body = Buffer.from(await upstream.arrayBuffer());
  const responseHeaders = Object.fromEntries(upstream.headers.entries());
  delete responseHeaders["content-encoding"];
  delete responseHeaders["content-length"];
  delete responseHeaders["connection"];
  delete responseHeaders["keep-alive"];
  delete responseHeaders["proxy-authenticate"];
  delete responseHeaders["proxy-authorization"];
  delete responseHeaders["te"];
  delete responseHeaders["trailer"];
  delete responseHeaders["transfer-encoding"];
  delete responseHeaders["upgrade"];

  response.writeHead(upstream.status, responseHeaders);
  response.end(body);
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://localhost:${port}`);
    const requestPath = url.pathname;

    if (requestPath.startsWith("/api/render")) {
      await proxyToRender(request, response, requestPath);
      return;
    }

    await serveStatic(requestPath, response);
  } catch (error) {
    console.error("Web proxy error", error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : String(error));
  }
}).listen(port, "127.0.0.1", () => {
  // Intentionally minimal logging so the server can be used in background tasks.
  console.log(`Web proxy running at http://localhost:${port}`);
});
