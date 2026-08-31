import { blake2AsHex } from "@polkadot/util-crypto";

export type ContentRefV1 = {
  version: 1;
  root: string;
  size: number;
};

export interface ContentProvider {
  put(bytes: Uint8Array): Promise<ContentRefV1>;
  get(ref: ContentRefV1): Promise<Uint8Array>;
  has(ref: ContentRefV1): Promise<boolean>;
}

export const DEFAULT_CONTENT_MAX_BYTES = 5 * 1024 * 1024;

export function contentRoot(bytes: Uint8Array): string {
  return blake2AsHex(bytes, 256).toLowerCase();
}

function verify(ref: ContentRefV1, bytes: Uint8Array): Uint8Array {
  if (ref.version !== 1 || !Number.isSafeInteger(ref.size) || ref.size < 0 || bytes.length !== ref.size) {
    throw new Error("CONTENT_INTEGRITY_ERROR: content size or version mismatch");
  }
  if (contentRoot(bytes) !== ref.root.toLowerCase()) {
    throw new Error("CONTENT_INTEGRITY_ERROR: content root mismatch");
  }
  return bytes;
}

export class MemoryContentProvider implements ContentProvider {
  private readonly objects = new Map<string, Uint8Array>();
  constructor(private readonly maxBytes = DEFAULT_CONTENT_MAX_BYTES) {}
  async put(bytes: Uint8Array): Promise<ContentRefV1> {
    if (bytes.length > this.maxBytes) throw new Error(`CONTENT_TOO_LARGE: maximum is ${this.maxBytes} bytes`);
    const copy = bytes.slice();
    const ref = { version: 1 as const, root: contentRoot(copy), size: copy.length };
    this.objects.set(ref.root, copy);
    return ref;
  }
  async get(ref: ContentRefV1): Promise<Uint8Array> {
    const bytes = this.objects.get(ref.root.toLowerCase());
    if (!bytes) throw new Error("CONTENT_NOT_FOUND");
    return verify(ref, bytes.slice());
  }
  async has(ref: ContentRefV1): Promise<boolean> {
    const bytes = this.objects.get(ref.root.toLowerCase());
    return bytes ? verify(ref, bytes.slice()) && true : false;
  }
}

export class HttpContentProvider implements ContentProvider {
  constructor(private readonly endpoint: string, private readonly maxBytes = DEFAULT_CONTENT_MAX_BYTES, private readonly uploadToken = "") {}
  private url(root: string) { return `${this.endpoint.replace(/\/$/, "")}/content/${root.replace(/^0x/, "")}`; }
  async put(bytes: Uint8Array): Promise<ContentRefV1> {
    if (bytes.length > this.maxBytes) throw new Error(`CONTENT_TOO_LARGE: maximum is ${this.maxBytes} bytes`);
    const ref = { version: 1 as const, root: contentRoot(bytes), size: bytes.length };
    const headers: Record<string, string> = { "content-type": "application/octet-stream", "x-content-size": String(ref.size) };
    if (this.uploadToken) headers.authorization = `Bearer ${this.uploadToken}`;
    const response = await fetch(this.url(ref.root), { method: "PUT", headers, body: new Uint8Array(bytes).buffer as ArrayBuffer });
    if (!response.ok) throw new Error(`CONTENT_UPLOAD_FAILED: ${response.status}`);
    const returned = await response.json().catch(() => ({})) as { root?: string; size?: number };
    if (returned.root && returned.root.toLowerCase() !== ref.root) throw new Error("CONTENT_INTEGRITY_ERROR: provider returned a different root");
    if (returned.size !== undefined && returned.size !== ref.size) throw new Error("CONTENT_INTEGRITY_ERROR: provider returned a different size");
    return ref;
  }
  async get(ref: ContentRefV1): Promise<Uint8Array> {
    const response = await fetch(this.url(ref.root));
    if (!response.ok) throw new Error(`CONTENT_NOT_FOUND: ${response.status}`);
    return verify(ref, new Uint8Array(await response.arrayBuffer()));
  }
  async has(ref: ContentRefV1): Promise<boolean> {
    const response = await fetch(this.url(ref.root), { method: "HEAD" });
    if (!response.ok) return false;
    const size = Number(response.headers.get("content-length"));
    return !Number.isFinite(size) || size === ref.size;
  }
}

export function contentRefFromJson(value: unknown): ContentRefV1 {
  if (!value || typeof value !== "object") throw new Error("INVALID_CONTENT_REF");
  const ref = value as Partial<ContentRefV1>;
  if (ref.version !== 1 || typeof ref.root !== "string" || !/^0x[0-9a-f]{64}$/i.test(ref.root) || typeof ref.size !== "number" || !Number.isSafeInteger(ref.size) || ref.size < 0) throw new Error("INVALID_CONTENT_REF");
  return { version: 1, root: ref.root.toLowerCase(), size: ref.size };
}
