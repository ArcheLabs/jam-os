import { ComputerService } from "../../jam/computer";
import { MockAccountAdapter } from "../../jam/account";
import { JamFileSystem } from "../../jam/filesystem";
import { MockJamClient } from "../../jam/MockJamClient";
import { JamNameService } from "../../jam/names";
import { MockPlaygroundAdapter } from "../../jam/playground";
import type { AccountAdapter, JamClient, PlaygroundAdapter } from "../../jam/types";
import type { ComputerRuntime, DoomInput, DoomLeaderboardEntry, DoomLeaderboardQuery, DoomResult, DoomRuntime, DoomRuntimeStatus, DoomSession, DoomStartOptions, EventRuntime, FileEntry, FileSystemRuntime, JamOsRuntimeV2, NameRuntime, NetworkInfoV2, NetworkRuntime, PlaygroundRuntime, RuntimeMode, ServiceInfo, ServiceRuntime, WorkHandle, WorkRequest, WorkResult, WorkRuntime, WorkStatus } from "../types";

class MockEvents implements EventRuntime {
  private listeners = new Map<string, Set<(payload: unknown) => void>>();
  subscribe(event: string, callback: (payload: unknown) => void) { const set = this.listeners.get(event) || new Set(); set.add(callback); this.listeners.set(event, set); return () => set.delete(callback); }
  emit(event: string, payload: unknown) { this.listeners.get(event)?.forEach((callback) => callback(payload)); }
}

class MountedFileSystem implements FileSystemRuntime {
  constructor(private readonly fs: JamFileSystem) {}
  private entry(node: { path: string; type: "file" | "directory"; size?: number; updatedAt?: number; mime?: string }): FileEntry { return { path: node.path, type: node.type, size: node.size || 0, updatedAt: node.updatedAt, mime: node.mime }; }
  async list(path: string) { return (await this.fs.list(path)).map((node) => this.entry(node)); }
  read(path: string) { return this.fs.read(path); }
  async write(path: string, data: Uint8Array, options?: { mime?: string }) { await this.fs.write(path, data, options?.mime); }
  async mkdir(path: string) { await this.fs.mkdir(path); }
  async remove(path: string, options: { recursive?: boolean } = {}) { await this.fs.remove(path, Boolean(options.recursive)); }
  async stat(path: string) { try { return this.entry(await this.fs.stat(path)); } catch { return null; } }
  readText(path: string) { return this.fs.readText(path); }
  async writeText(path: string, content: string, mime?: string) { await this.fs.write(path, content, mime); }
  async rename(from: string, to: string) { await this.fs.rename(from, to); }
  publish(path?: string) { return this.fs.publish(path); }
  manifest() { return this.fs.manifest(); }
  readPublished(path: string) { return this.fs.readPublished(path); }
  mount(_serviceId: string) { return this; }
}

class MockDoom implements DoomRuntime {
  private sessions = new Map<string, DoomSession>();
  private results: DoomResult[] = [];
  private readonly entries: DoomLeaderboardEntry[] = [
    { id: "demo-1", account: "5F8…cx2", displayName: "Alice", score: 42840, map: "E1M4", difficulty: "Hurt Me Plenty", kills: 31, durationMs: 184000, completedAt: 1710000000000, rulesetVersion: 1, sessionId: "demo-session-1", runId: "demo-run-1", runtime: "mock" },
    { id: "demo-2", account: "5Gav…in7", displayName: "Gavin", score: 39120, map: "E1M4", difficulty: "Hurt Me Plenty", kills: 28, durationMs: 210000, completedAt: 1710000000000, rulesetVersion: 1, sessionId: "demo-session-2", runId: "demo-run-2", runtime: "mock" },
    { id: "demo-3", account: "14F…91k", displayName: "Charlie", score: 35540, map: "E1M3", difficulty: "Hurt Me Plenty", kills: 25, durationMs: 226000, completedAt: 1710000000000, rulesetVersion: 1, sessionId: "demo-session-3", runId: "demo-run-3", runtime: "mock" },
  ];
  async status(): Promise<DoomRuntimeStatus> { return "ready"; }
  async start(options: DoomStartOptions = {}) { const session = { id: `mock-doom-${Date.now()}`, startedAt: Date.now(), mode: "mock" as const, map: options.map || "E1M1", difficulty: options.difficulty || "Hurt Me Plenty" }; this.sessions.set(session.id, session); return session; }
  async input(sessionId: string, _input: DoomInput) { if (!this.sessions.has(sessionId)) throw new Error("DOOM session is not running"); }
  async stop(sessionId: string) { const session = this.sessions.get(sessionId); if (!session) throw new Error("DOOM session is not running"); this.sessions.delete(sessionId); const result = { sessionId, account: "5MockJAMComputerAccount", score: 12400, map: session.map || "E1M1", difficulty: session.difficulty || "Hurt Me Plenty", kills: 12, durationMs: Math.max(1000, Date.now() - session.startedAt), finishedAt: Date.now(), completed: true }; this.results.unshift(result); return result; }
  async leaderboard(query: DoomLeaderboardQuery = {}) { const own = this.results.map((result) => ({ id: `mock-result-${result.sessionId}`, account: result.account, displayName: "You", score: result.score, map: result.map, difficulty: result.difficulty, kills: result.kills, durationMs: result.durationMs, completedAt: result.finishedAt, rulesetVersion: 1, sessionId: result.sessionId, runId: `mock-run-${result.sessionId}`, runtime: "mock" as const })); const values = [...this.entries, ...own].filter((entry) => !query.account || entry.account === query.account).sort((a, b) => b.score - a.score); return values.slice(0, query.limit || 20).map((entry, index) => ({ ...entry, rank: index + 1 } as DoomLeaderboardEntry & { rank: number })); }
}

class MockWork implements WorkRuntime {
  private statuses = new Map<string, WorkStatus>();
  constructor(private readonly events: MockEvents) {}
  async submit(input: WorkRequest): Promise<WorkHandle> { const id = `mock-work-${Date.now()}`; this.statuses.set(id, { id, state: "running", detail: input.serviceId }); this.events.emit("work:submitted", { id }); setTimeout(() => this.statuses.set(id, { id, state: "complete" }), 40); return { id, submittedAt: Date.now() }; }
  async status(id: string) { return this.statuses.get(id) || { id, state: "failed" as const, detail: "Unknown work" }; }
  async wait(id: string): Promise<WorkResult> { const started = Date.now(); while ((await this.status(id)).state === "running" && Date.now() - started < 2000) await new Promise((resolve) => setTimeout(resolve, 20)); if ((await this.status(id)).state !== "complete") throw new Error("Mock work failed"); this.events.emit("work:completed", { id }); return { id, output: new Uint8Array(), completedAt: Date.now() }; }
}

export class MockJamOsRuntime implements JamOsRuntimeV2 {
  readonly mode: RuntimeMode = "mock";
  private readonly client: JamClient = new MockJamClient();
  readonly account: AccountAdapter = new MockAccountAdapter(this.client);
  private readonly playgroundAdapter: PlaygroundAdapter = new MockPlaygroundAdapter();
  private readonly computerAdapter = new ComputerService(this.client, this.account, this.playgroundAdapter);
  private readonly namesAdapter = new JamNameService(this.client, this.account);
  readonly events = new MockEvents();
  readonly doom: DoomRuntime = new MockDoom();
  readonly computer: ComputerRuntime = { current: () => this.computerAdapter.current(), provision: (onProgress) => this.computerAdapter.provision(onProgress), inspect: (id) => this.computerAdapter.inspect(id) };
  readonly playground: PlaygroundRuntime = this.playgroundAdapter;
  readonly fs: FileSystemRuntime = { list: async () => [], read: async () => new Uint8Array(), write: async () => undefined, mkdir: async () => undefined, remove: async () => undefined, stat: async () => null, readText: async () => "", writeText: async () => undefined, rename: async () => undefined, publish: async () => ({ files: {} }), manifest: async () => null, readPublished: async () => ({ bytes: new Uint8Array(), mime: "application/octet-stream" }), mount: (id) => new MountedFileSystem(this.computerAdapter.fs(id)) };
  readonly system: JamOsRuntimeV2["system"] = { getInfo: async () => ({ osVersion: "0.1", networkName: "MiniJAM Preview", serviceId: undefined, cpuUsage: { value: 12, source: "mock" as const }, memoryUsage: { value: 1.4, source: "mock" as const }, memoryTotal: { value: 4, source: "mock" as const }, storageUsed: { value: 42, source: "mock" as const }, storageTotal: { value: 64, source: "mock" as const }, status: "online" as const }) };
  readonly network: NetworkRuntime = { getInfo: async (): Promise<NetworkInfoV2> => { const network = await this.client.network(); return { ...network, source: "mock", workCount: 12, eventCount: 34 }; } };
  readonly services: ServiceRuntime = { list: async (): Promise<ServiceInfo[]> => [{ id: "computer", name: "Computer Service", status: "running", source: "mock" }, { id: "storage", name: "Storage", status: "running", source: "mock" }, { id: "playground", name: "Playground", status: "running", source: "mock" }], inspect: (id) => this.computerAdapter.inspect(id), call: async (id, payload, account) => (await this.client.invokeService(id, payload, { account })).output };
  readonly work: WorkRuntime = new MockWork(this.events);
  readonly names: NameRuntime = { resolve: (name: string) => this.namesAdapter.resolve(name), claim: (name: string, id: string) => this.namesAdapter.claim(name, id), bind: (name: string, id: string) => this.namesAdapter.bind(name, id) };
}
