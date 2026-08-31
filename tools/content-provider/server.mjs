import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { blake2b } from "@noble/hashes/blake2b.js";

const host = process.env.CONTENT_HOST || "0.0.0.0";
const port = Number(process.env.CONTENT_PORT || 8787);
const rootDir = resolve(process.env.CONTENT_VOLUME || "./.content-provider");
const maxBytes = Number(process.env.CONTENT_MAX_BYTES || 5 * 1024 * 1024);
const uploadToken = process.env.CONTENT_UPLOAD_TOKEN || "";
const authMode = process.env.CONTENT_AUTH_MODE || "wallet-signature";
const providerDomain = (process.env.CONTENT_PROVIDER_DOMAIN || "").replace(/^0x/i, "").toLowerCase();
const uploadDomain = Buffer.from("JAM_CONTENT_UPLOAD_V1");
let cryptoVerifier;

function digest(bytes) { return Buffer.from(blake2b(bytes, { dkLen: 32 })).toString("hex"); }
function objectPath(root) { return join(rootDir, root.slice(0, 2), root.slice(2)); }
function validRoot(root) { return /^[0-9a-f]{64}$/i.test(root); }
function decodeHex(value, bytes, name) { const normalized = String(value || "").replace(/^0x/i, ""); if (!new RegExp(`^[0-9a-f]{${bytes * 2}}$`, "i").test(normalized)) throw new Error(`invalid ${name}`); return Buffer.from(normalized, "hex"); }
function permitDigest(account, root, size, expires) {
  const body = Buffer.alloc(1 + 32 + 32 + 32 + 8 + 8);
  body[0] = 1;
  Buffer.from(providerDomain, "hex").copy(body, 1);
  account.copy(body, 33);
  root.copy(body, 65);
  body.writeBigUInt64LE(BigInt(size), 97);
  body.writeBigUInt64LE(BigInt(expires), 105);
  return blake2b(Buffer.concat([uploadDomain, body]), { dkLen: 32 });
}
async function verifyWalletPermit(request, root, size) {
  if (authMode !== "wallet-signature") return false;
  if (!/^[0-9a-f]{64}$/.test(providerDomain)) return false;
  if (request.headers["x-jam-upload-version"] !== "1") return false;
  const account = decodeHex(request.headers["x-jam-account"], 32, "account");
  const claimedDomain = decodeHex(request.headers["x-jam-provider-domain"], 32, "provider domain");
  if (claimedDomain.toString("hex") !== providerDomain) return false;
  const claimedSize = Number(request.headers["x-jam-content-size"]);
  if (!Number.isSafeInteger(claimedSize) || claimedSize !== size) return false;
  const expires = Number(request.headers["x-jam-expires"]);
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const signature = decodeHex(request.headers["x-jam-signature"], 64, "signature");
  cryptoVerifier ||= import("@polkadot/util-crypto").then(async (module) => { await module.cryptoWaitReady(); return module.sr25519Verify; });
  const sr25519Verify = await cryptoVerifier;
  return sr25519Verify(permitDigest(account, root, size, expires), signature, account);
}
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
      const bytes = await readBody(request);
      if (authMode === "test-token") {
        if (!uploadToken || request.headers.authorization !== `Bearer ${uploadToken}`) return send(response, 401, "upload authorization required");
      } else if (!(await verifyWalletPermit(request, root, bytes.length))) {
        return send(response, 401, "wallet upload permit required");
      }
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
