import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";

const host = process.env.CONTENT_HOST || "0.0.0.0";
const port = Number(process.env.CONTENT_PORT || 8787);
const rootDir = resolve(process.env.CONTENT_VOLUME || "./.content-provider");
const maxBytes = Number(process.env.CONTENT_MAX_BYTES || 5 * 1024 * 1024);
const uploadToken = process.env.CONTENT_UPLOAD_TOKEN || "";

function digest(bytes) { return createHash("blake2b512").update(bytes).digest().subarray(0, 32).toString("hex"); }
function objectPath(root) { return join(rootDir, root.slice(0, 2), root.slice(2)); }
function validRoot(root) { return /^[0-9a-f]{64}$/i.test(root); }
function send(response, status, body, headers = {}) { response.writeHead(status, { "cache-control": "public, max-age=31536000, immutable", ...headers }); response.end(body); }
async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("object exceeds configured maximum"), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (request.method === "GET" && url.pathname === "/health/ready") return send(response, 200, JSON.stringify({ ready: true, maxBytes }), { "content-type": "application/json" });
    const match = url.pathname.match(/^\/content\/([0-9a-f]{64})$/i);
    if (!match || !["GET", "HEAD", "PUT"].includes(request.method || "")) return send(response, 404, "not found", { "content-type": "text/plain" });
    const root = match[1].toLowerCase();
    const target = objectPath(root);
    if (request.method === "PUT") {
      if (uploadToken && request.headers.authorization !== `Bearer ${uploadToken}`) return send(response, 401, "upload authorization required");
      if (!uploadToken) return send(response, 503, "uploads are disabled until CONTENT_UPLOAD_TOKEN is configured");
      const bytes = await readBody(request);
      if (digest(bytes) !== root) return send(response, 422, "content hash does not match root");
      await mkdir(join(rootDir, root.slice(0, 2)), { recursive: true });
      const temporary = `${target}.${randomUUID()}.upload`;
      try { await writeFile(temporary, bytes, { flag: "wx", mode: 0o640 }); await rename(temporary, target); } finally { await unlink(temporary).catch(() => undefined); }
      return send(response, 201, JSON.stringify({ version: 1, root, size: bytes.length }), { "content-type": "application/json" });
    }
    const metadata = await stat(target).catch(() => null);
    if (!metadata) return send(response, 404, "not found");
    if (request.method === "HEAD") return send(response, 200, undefined, { "content-length": String(metadata.size), "content-type": "application/octet-stream" });
    const bytes = await readFile(target);
    if (digest(bytes) !== root || bytes.length > maxBytes) return send(response, 500, "stored object failed integrity check");
    return send(response, 200, bytes, { "content-length": String(bytes.length), "content-type": "application/octet-stream" });
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    return send(response, status, status === 413 ? "object too large" : "content provider failure");
  }
});

await mkdir(rootDir, { recursive: true });
server.listen(port, host, () => console.log(`content provider listening on ${host}:${port}`));
