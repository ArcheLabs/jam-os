import { decodeServiceBytes, jsonBytes, parseBytes } from "./JamClient";
import type { DirectoryNode, FileNode, JamClient, JamSiteManifest, ListedNode } from "./types";
import { basename, normalizePath, parentPath } from "../protocols/jamFs";
import { bytesToBase64 } from "./encoding";

const bytes = (value: string | Uint8Array) => typeof value === "string" ? new TextEncoder().encode(value) : value;
const mimeFor = (path: string) => ({ html: "text/html", htm: "text/html", css: "text/css", txt: "text/plain", md: "text/markdown", json: "application/json", c: "text/x-c", cpp: "text/x-c++src", h: "text/x-c", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" } as Record<string, string>)[path.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream";

export class JamFileSystem {
  constructor(private readonly client: JamClient, public readonly serviceId: string) {}
  async stat(path: string): Promise<FileNode | DirectoryNode> { return decodeServiceBytes(await this.client.readService(this.serviceId, jsonBytes({ op: "fs:stat", path: normalizePath(path) }))); }
  async list(path: string): Promise<ListedNode[]> { return decodeServiceBytes(await this.client.readService(this.serviceId, jsonBytes({ op: "fs:list", path: normalizePath(path) }))); }
  async read(path: string): Promise<Uint8Array> { const result = decodeServiceBytes<{ bytes: number[] }>(await this.client.readService(this.serviceId, jsonBytes({ op: "fs:read", path: normalizePath(path) }))); return new Uint8Array(result.bytes); }
  async readText(path: string): Promise<string> { return new TextDecoder().decode(await this.read(path)); }
  async write(path: string, content: string | Uint8Array, mime = mimeFor(path)) { await this.client.invokeService(this.serviceId, jsonBytes({ op: "fs:write", path: normalizePath(path), contentBase64: bytesToBase64(bytes(content)), mime })); }
  async mkdir(path: string) { await this.client.invokeService(this.serviceId, jsonBytes({ op: "fs:mkdir", path: normalizePath(path) })); }
  async remove(path: string, recursive = false) { await this.client.invokeService(this.serviceId, jsonBytes({ op: "fs:remove", path: normalizePath(path), recursive })); }
  async rename(from: string, to: string) { await this.client.invokeService(this.serviceId, jsonBytes({ op: "fs:rename", from: normalizePath(from), to: normalizePath(to) })); }
  async publish(path = "/home/user/Sites/home"): Promise<JamSiteManifest> { return decodeServiceBytes(await this.client.invokeService(this.serviceId, jsonBytes({ op: "site:publish", path: normalizePath(path) })).then((r) => r.output)); }
  async manifest(): Promise<JamSiteManifest | null> { return decodeServiceBytes(await this.client.readService(this.serviceId, jsonBytes({ op: "site:manifest" }))); }
  async readPublished(path: string): Promise<{ bytes: Uint8Array; mime: string }> { const result = decodeServiceBytes<{ bytes: number[]; mime: string }>(await this.client.readService(this.serviceId, jsonBytes({ op: "site:read", path: normalizePath(path) }))); return { bytes: new Uint8Array(result.bytes), mime: result.mime }; }
  static displayName(node: ListedNode) { return basename(node.path); }
  static parent(path: string) { return parentPath(path); }
}
