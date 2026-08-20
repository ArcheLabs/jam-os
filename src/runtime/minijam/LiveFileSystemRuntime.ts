import { bytesToBase64 } from "../../jam/encoding";
import { jsonBytes } from "../../jam/JamClient";
import { normalizePath } from "../../protocols/jamFs";
import type { FileEntry, FileManifest, FileSystemRuntime, WorkRuntime } from "../types";
import { MiniJamApiError, MiniJamApiClient } from "./MiniJamApiClient";

type StoredNode = { path?: string; type?: "file" | "directory"; size?: number; contentHash?: string; mime?: string; updatedAt?: number; children?: string[] };
type StoredDirectory = { children: string[] };

function parseJson<T>(bytes: Uint8Array, operation: string): T { try { return JSON.parse(new TextDecoder().decode(bytes)) as T; } catch { throw new MiniJamApiError("INVALID_RESPONSE", `Computer Service returned invalid JSON for ${operation}`); } }
function childPath(path: string, name: string) { return `${path === "/" ? "" : path}/${name}`; }

export class LiveFileSystemRuntime implements FileSystemRuntime {
  constructor(private readonly api: MiniJamApiClient, private readonly work: WorkRuntime, private readonly serviceId?: string) {}
  private get id() { if (!this.serviceId) throw new MiniJamApiError("SERVICE_UNAVAILABLE", "Computer Service is not mounted", undefined, false); return this.serviceId; }
  private key(kind: "node" | "dir" | "blob", value: string) { return `fs:${kind}:${value}`; }
  private async node(path: string) { const bytes = await this.api.getStorage(this.id, this.key("node", normalizePath(path))); return bytes ? parseJson<StoredNode>(bytes, "fs:stat") : null; }
  private entry(path: string, node: StoredNode): FileEntry { return { path: node.path || path, type: node.type || (node.children ? "directory" : "file"), size: node.size || 0, mime: node.mime, updatedAt: node.updatedAt }; }
  async list(path: string) { const normalized = normalizePath(path); const bytes = await this.api.getStorage(this.id, this.key("dir", normalized)); if (!bytes) return []; const directory = parseJson<StoredDirectory>(bytes, "fs:list"); const entries = await Promise.all(directory.children.map(async (name) => { const child = childPath(normalized, name); const node = await this.node(child); return node ? this.entry(child, node) : null; })); return entries.filter((entry): entry is FileEntry => Boolean(entry)); }
  async stat(path: string) { const normalized = normalizePath(path); const node = await this.node(normalized); return node ? this.entry(normalized, node) : null; }
  async read(path: string) { const normalized = normalizePath(path); const node = await this.node(normalized); if (!node) throw new MiniJamApiError("NOT_FOUND", normalized, 404); if (node.type === "directory" || !node.contentHash) throw new MiniJamApiError("INVALID_RESPONSE", `File node ${normalized} has no content hash`); const bytes = await this.api.getStorage(this.id, this.key("blob", node.contentHash)); if (!bytes) throw new MiniJamApiError("NOT_FOUND", normalized, 404); return bytes; }
  readText(path: string) { return this.read(path).then((bytes) => new TextDecoder().decode(bytes)); }
  async write(path: string, data: Uint8Array, options?: { mime?: string }) { await this.mutate({ op: "fs:write", path: normalizePath(path), contentBase64: bytesToBase64(data), mime: options?.mime || "application/octet-stream" }); }
  writeText(path: string, content: string, mime?: string) { return this.write(path, new TextEncoder().encode(content), { mime }); }
  async mkdir(path: string) { await this.mutate({ op: "fs:mkdir", path: normalizePath(path) }); }
  async remove(path: string, options: { recursive?: boolean } = {}) { await this.mutate({ op: "fs:remove", path: normalizePath(path), recursive: Boolean(options.recursive) }); }
  async rename(from: string, to: string) { await this.mutate({ op: "fs:rename", from: normalizePath(from), to: normalizePath(to) }); }
  private async mutate(request: Record<string, unknown>) { const handle = await this.work.submit({ serviceId: this.id, payload: jsonBytes(request) }); await this.work.wait(handle.id); }
  async publish(path = "/home/user/Sites/home") { await this.mutate({ op: "site:publish", path: normalizePath(path) }); return (await this.manifest()) || { files: {} }; }
  async manifest(): Promise<FileManifest | null> { const bytes = await this.api.getStorage(this.id, "site:manifest"); return bytes ? parseJson<FileManifest>(bytes, "site:manifest") : null; }
  async readPublished(path: string) { const manifest = await this.manifest(); if (!manifest) throw new MiniJamApiError("NOT_FOUND", "No published site", 404); const entry = Array.isArray(manifest.files) ? manifest.files.find((item) => item.path === path) : manifest.files[path]; if (!entry) throw new MiniJamApiError("NOT_FOUND", path, 404); const hash = (entry as { contentHash?: string; hash?: string }).contentHash || (entry as { hash?: string }).hash || path; const bytes = await this.api.getStorage(this.id, this.key("blob", hash)); if (!bytes) throw new MiniJamApiError("NOT_FOUND", path, 404); return { bytes, mime: (entry as { mime?: string }).mime || "application/octet-stream" }; }
  mount(serviceId: string) { return new LiveFileSystemRuntime(this.api, this.work, serviceId); }
}
