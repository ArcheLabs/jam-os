import { JamNotFoundError, JamPermissionError, JamProtocolError } from "./errors";
import { jsonBytes, parseBytes } from "./JamClient";
import { base64ToBytes } from "./encoding";
import type { AccountInfo, InvokeOptions, InvokeResult, JamClient, NetworkInfo } from "./types";
import { basename, normalizePath, parentPath } from "../protocols/jamFs";
import { MOCK_COMPUTER_CODE_HASH } from "./constants";

type StoredFile = { version?: 1; type: "file"; bytes: number[]; mime: string; hash: string; updatedAt: number };
type ServiceState = { owner: string; files: Record<string, StoredFile>; dirs: Set<string>; manifest: unknown | null };
const KEY = "jam-computer-mock-v1";
const HOME_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>My JAM Computer</title><style>body{background:#0b0b0f;color:#f4f4f5;font-family:monospace;max-width:720px;margin:64px auto}a{color:#7dd3fc}</style></head><body><h1>Hello JAM.</h1><p>This page lives on my JAM Computer.</p><p><jam-link href="jam://alice">Visit a JAM page</jam-link></p></body></html>`;
const MAX_FILE_BYTES = 128 * 1024;
const MAX_SITE_BYTES = 512 * 1024;
const MAX_FILE_COUNT = 128;

interface Snapshot { nextId: number; services: Record<string, { owner: string; files: Record<string, StoredFile>; dirs: string[]; manifest: unknown | null }>; }
export class MockJamClient implements JamClient {
  readonly isMock = true;
  private state: Snapshot;
  private account: AccountInfo = { address: "5MockJAMComputerAccount", name: "Mock account", source: "mock" };
  constructor() { this.state = this.load(); }
  private load(): Snapshot { try { const saved = localStorage.getItem(KEY); if (saved) return JSON.parse(saved) as Snapshot; } catch { /* private browsing */ } return { nextId: 1000, services: {} }; }
  private save() { try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* optional persistence */ } }
  private service(serviceId: string): ServiceState { const value = this.state.services[serviceId]; if (!value) throw new JamNotFoundError(`Service ${serviceId} was not found`); return { owner: value.owner, files: value.files, dirs: new Set(value.dirs), manifest: value.manifest }; }
  private commit(id: string, service: ServiceState) { this.state.services[id] = { owner: service.owner, files: service.files, dirs: [...service.dirs], manifest: service.manifest }; this.save(); }
  async network(): Promise<NetworkInfo> { return { name: import.meta.env.VITE_MINIJAM_NETWORK_NAME || "MiniJAM Testnet", endpoint: "mock://minijam", healthy: true, block: "mock-finalized", genesisHash: "0xmock-genesis-v1" }; }
  async getCurrentAccount() { return this.account; }
  async readService(serviceId: string, request: Uint8Array): Promise<Uint8Array> { return this.execute(serviceId, parseBytes<{ op: string; [key: string]: unknown }>(request), null, false); }
  async invokeService(serviceId: string, request: Uint8Array, options?: InvokeOptions): Promise<InvokeResult> { return { output: this.execute(serviceId, parseBytes<{ op: string; [key: string]: unknown }>(request), options?.account ?? this.account, true) }; }
  private execute(serviceId: string, req: { op: string; [key: string]: unknown }, account: AccountInfo | null, write: boolean): Uint8Array {
    if (req.op === "computer:create") { const id = String(this.state.nextId++); this.state.services[id] = { owner: account?.address ?? this.account.address, files: {}, dirs: ["/", "/home", "/home/user", "/home/user/Documents", "/home/user/Projects", "/home/user/Projects/counter", "/home/user/Sites", "/home/user/Sites/home"], manifest: null }; const svc = this.service(id); this.put(svc, "/home/user/Sites/home/index.html", new TextEncoder().encode(HOME_HTML), "text/html"); this.put(svc, "/home/user/Projects/counter/main.c", new TextEncoder().encode("#include <stdint.h>\nint main(void) { return 0; }\n"), "text/x-c"); this.put(svc, "/home/user/Projects/counter/README.md", new TextEncoder().encode("# Counter\n\nA MiniJAM project.\n"), "text/markdown"); this.commit(id, svc); return jsonBytes({ serviceId: id }); }
    const svc = this.service(serviceId); if (write && account?.address !== svc.owner) throw new JamPermissionError("Only the Computer Service owner can write");
    switch (req.op) {
      case "fs:stat": { const path = normalizePath(String(req.path)); if (svc.files[path]) return jsonBytes(this.fileNode(path, svc.files[path])); if (svc.dirs.has(path)) return jsonBytes({ version: 1, type: "directory", path, children: this.children(svc, path) }); throw new JamNotFoundError(path); }
      case "fs:list": { const path = normalizePath(String(req.path)); if (!svc.dirs.has(path)) throw new JamNotFoundError(path); return jsonBytes(this.children(svc, path).map((name) => { const child = `${path === "/" ? "" : path}/${name}`; return svc.files[child] ? this.fileNode(child, svc.files[child]) : { version: 1, type: "directory", path: child, children: this.children(svc, child) }; })); }
      case "fs:read": { const file = svc.files[normalizePath(String(req.path))]; if (!file) throw new JamNotFoundError(String(req.path)); return jsonBytes({ bytes: file.bytes, mime: file.mime }); }
      case "fs:write": { const path = normalizePath(String(req.path)); const data = req.contentBase64 ? base64ToBytes(String(req.contentBase64)) : new Uint8Array((req.bytes || []) as number[]); this.put(svc, path, data, String(req.mime || "text/plain")); this.commit(serviceId, svc); return jsonBytes({ ok: true }); }
      case "fs:mkdir": { const path = normalizePath(String(req.path)); this.ensureParents(svc, path); svc.dirs.add(path); this.commit(serviceId, svc); return jsonBytes({ ok: true }); }
      case "fs:remove": { const path = normalizePath(String(req.path)); const recursive = Boolean(req.recursive); const children = Object.keys(svc.files).filter((p) => p === path || p.startsWith(`${path}/`)); if (!recursive && (children.length || [...svc.dirs].some((p) => p.startsWith(`${path}/`)))) throw new Error("Directory is not empty"); children.forEach((p) => delete svc.files[p]); [...svc.dirs].filter((p) => p === path || p.startsWith(`${path}/`)).forEach((p) => svc.dirs.delete(p)); this.commit(serviceId, svc); return jsonBytes({ ok: true }); }
      case "fs:rename": { const from = normalizePath(String(req.from)); const to = normalizePath(String(req.to)); const moved = Object.entries(svc.files).filter(([p]) => p === from || p.startsWith(`${from}/`)); moved.forEach(([p, f]) => { delete svc.files[p]; svc.files[to + p.slice(from.length)] = { ...f }; }); [...svc.dirs].filter((p) => p === from || p.startsWith(`${from}/`)).forEach((p) => { svc.dirs.delete(p); svc.dirs.add(to + p.slice(from.length)); }); this.commit(serviceId, svc); return jsonBytes({ ok: true }); }
      case "site:manifest": return jsonBytes(svc.manifest);
      case "site:publish": { const source = normalizePath(String(req.path)); const files: Record<string, { mime: string; size: number; contentHash: string; chunks: number }> = {}; let total = 0; Object.entries(svc.files).filter(([p]) => p === source || p.startsWith(`${source}/`)).forEach(([p, f]) => { const sitePath = p.slice(source.length) || "/"; total += f.bytes.length; files[sitePath] = { mime: f.mime, size: f.bytes.length, contentHash: f.hash, chunks: 1 }; }); if (total > MAX_SITE_BYTES) throw new JamProtocolError(`Published site exceeds the ${MAX_SITE_BYTES} byte limit`, "SITE_TOO_LARGE"); svc.manifest = { version: 1, root: source, publishedAt: Date.now(), generatedAt: Date.now(), index: "/index.html", files }; this.commit(serviceId, svc); return jsonBytes(svc.manifest); }
      case "site:read": { const manifest = svc.manifest as { files?: Record<string, { contentHash: string }> } | null; const path = normalizePath(String(req.path)); const file = manifest?.files?.[path]; if (!file) throw new JamNotFoundError(`Published file ${path}`); const match = Object.values(svc.files).find((f) => f.hash === file.contentHash); if (!match) throw new JamNotFoundError(path); return jsonBytes({ bytes: match.bytes, mime: match.mime }); }
      case "computer:init": return jsonBytes({ ok: true, initialized: true });
      case "service:inspect": return jsonBytes({ kind: "jam-computer", protocolVersion: 1, serviceId, owner: svc.owner, controller: svc.owner, codeHash: MOCK_COMPUTER_CODE_HASH, createdAt: 0, files: Object.keys(svc.files).length });
      case "service:call": return jsonBytes({ status: "succeeded", output: `Mock service ${serviceId} received ${String(req.payload || "")}` });
      default: throw new Error(`Unknown mock operation ${req.op}`);
    }
  }
  private children(svc: ServiceState, path: string): string[] { const prefix = path === "/" ? "/" : `${path}/`; const names = new Set<string>(); [...svc.dirs].filter((p) => p.startsWith(prefix) && p !== path).forEach((p) => { const rest = p.slice(prefix.length); if (rest && !rest.includes("/")) names.add(rest); }); Object.keys(svc.files).filter((p) => p.startsWith(prefix)).forEach((p) => { const rest = p.slice(prefix.length); if (rest && !rest.includes("/")) names.add(rest); }); return [...names].sort(); }
  private ensureParents(svc: ServiceState, path: string) { const parts = path.split("/"); let current = ""; for (const part of parts) { if (!part) continue; current += `/${part}`; svc.dirs.add(current); } }
  private fileNode(path: string, file: StoredFile) { return { version: 1, type: "file" as const, path, size: file.bytes.length, contentHash: file.hash, chunkSize: file.bytes.length || 1, chunks: 1, mime: file.mime, updatedAt: file.updatedAt }; }
  private put(svc: ServiceState, path: string, bytes: Uint8Array, mime: string) { if (bytes.length > MAX_FILE_BYTES) throw new JamProtocolError(`File exceeds the ${MAX_FILE_BYTES} byte limit`, "FILE_TOO_LARGE"); if (!svc.files[path] && Object.keys(svc.files).length >= MAX_FILE_COUNT) throw new JamProtocolError(`Computer Service supports at most ${MAX_FILE_COUNT} files`, "FILE_COUNT_LIMIT"); this.ensureParents(svc, parentPath(path)); svc.files[path] = { version: 1, type: "file", bytes: [...bytes], mime, hash: `${bytes.length}-${bytes.slice(0, 16).join("-")}`, updatedAt: Date.now() }; }
}
