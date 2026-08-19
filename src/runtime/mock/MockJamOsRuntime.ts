import { ComputerService } from "../../jam/computer";
import { MockAccountAdapter } from "../../jam/account";
import { JamFileSystem } from "../../jam/filesystem";
import { MockJamClient } from "../../jam/MockJamClient";
import { JamNameService } from "../../jam/names";
import { MockPlaygroundAdapter } from "../../jam/playground";
import type { AccountInfo, JamClient, PlaygroundAdapter } from "../../jam/types";
import type { RuntimeCompatibility } from "../types";
import type { AccountAdapter, DoomInput, DoomLeaderboardEntry, DoomLeaderboardQuery, DoomResult, DoomRuntime, DoomRuntimeStatus, DoomSession, DoomStartOptions, EventRuntime, FileEntry, FileSystemRuntime, JamOsRuntimeV2, NameRuntime, NetworkInfoV2, NetworkRuntime, RuntimeMode, ServiceInfo, ServiceRuntime, WorkHandle, WorkRequest, WorkResult, WorkRuntime, WorkStatus } from "../types";

class Events implements EventRuntime {
  private listeners = new Map<string, Set<(payload: unknown) => void>>();
  subscribe(event: string, callback: (payload: unknown) => void) { const set = this.listeners.get(event) || new Set(); set.add(callback); this.listeners.set(event, set); return () => set.delete(callback); }
  emit(event: string, payload: unknown) { this.listeners.get(event)?.forEach((callback) => callback(payload)); }
}

class MountedFileSystem implements FileSystemRuntime {
  constructor(private readonly fs: JamFileSystem) {}
  async list(path: string) { return (await this.fs.list(path)).map((node): FileEntry => ({ path: node.path, type: node.type, size: node.type === "file" ? node.size : 0, updatedAt: node.type === "file" ? node.updatedAt : undefined })); }
  read(path: string) { return this.fs.read(path); }
  async write(path: string, data: Uint8Array) { await this.fs.write(path, data); }
  mkdir(path: string) { return this.fs.mkdir(path); }
  async remove(path: string) { await this.fs.remove(path, true); }
  async stat(path: string) { try { const node = await this.fs.stat(path); return { path: node.path, type: node.type, size: node.type === "file" ? node.size : 0, updatedAt: node.type === "file" ? node.updatedAt : undefined }; } catch { return null; } }
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
  async leaderboard(query: DoomLeaderboardQuery = {}) { const own = this.results.map((result, index) => ({ id: `mock-result-${result.sessionId}`, account: result.account, displayName: "You", score: result.score, map: result.map, difficulty: result.difficulty, kills: result.kills, durationMs: result.durationMs, completedAt: result.finishedAt, rulesetVersion: 1, sessionId: result.sessionId, runId: `mock-run-${result.sessionId}`, runtime: "mock" as const })); const values = [...this.entries, ...own].filter((entry) => !query.account || entry.account === query.account).sort((a, b) => b.score - a.score); return values.slice(0, query.limit || 20).map((entry, index) => ({ ...entry, rank: index + 1 } as DoomLeaderboardEntry & { rank: number })); }
}

export class MockJamOsRuntime implements JamOsRuntimeV2, RuntimeCompatibility {
  readonly mode: RuntimeMode = "mock";
  readonly client: JamClient = new MockJamClient();
  readonly account: AccountAdapter = new MockAccountAdapter(this.client);
  readonly computer = new ComputerService(this.client, this.account, new MockPlaygroundAdapter());
  readonly namesService = new JamNameService(this.client, this.account);
  readonly playground: PlaygroundAdapter = new MockPlaygroundAdapter();
  readonly events = new Events();
  readonly doom: DoomRuntime = new MockDoom();
  readonly fs: FileSystemRuntime = { list: async () => [], read: async () => new Uint8Array(), write: async () => undefined, mkdir: async () => undefined, remove: async () => undefined, stat: async () => null, mount: (id) => new MountedFileSystem(this.computer.fs(id)) };
  readonly system: JamOsRuntimeV2["system"] = { getInfo: async () => ({ osVersion: "0.1", networkName: "MiniJAM Preview", serviceId: undefined, cpuUsage: { value: 12, source: "mock" as const }, memoryUsage: { value: 1.4, source: "mock" as const }, memoryTotal: { value: 4, source: "mock" as const }, storageUsed: { value: 42, source: "mock" as const }, storageTotal: { value: 64, source: "mock" as const }, status: "online" as const }) };
  readonly network: NetworkRuntime = { getInfo: async (): Promise<NetworkInfoV2> => { const network = await this.client.network(); return { ...network, source: "mock", workCount: 12, eventCount: 34 }; } };
  readonly services: ServiceRuntime = { list: async (): Promise<ServiceInfo[]> => [{ id: "computer", name: "Computer Service", status: "running", source: "mock" }, { id: "storage", name: "Storage", status: "running", source: "mock" }, { id: "playground", name: "Playground", status: "running", source: "mock" }], inspect: (id) => this.computer.inspect(id), call: async (id, payload, account) => (await this.client.invokeService(id, payload, { account })).output };
  readonly work: WorkRuntime = new MockWork(this.events);
  readonly names: NameRuntime = { resolve: (name: string) => this.namesService.resolve(name), claim: (name: string, id: string) => this.namesService.claim(name, id), bind: (name: string, id: string) => this.namesService.bind(name, id) };
}

class MockWork {
  private statuses = new Map<string, WorkStatus>();
  constructor(private readonly events: Events) {}
  async submit(input: WorkRequest): Promise<WorkHandle> { const id = `mock-work-${Date.now()}`; this.statuses.set(id, { id, state: "running", detail: input.serviceId }); this.events.emit("work:submitted", { id }); setTimeout(() => this.statuses.set(id, { id, state: "complete" }), 40); return { id, submittedAt: Date.now() }; }
  async status(id: string) { return this.statuses.get(id) || { id, state: "failed" as const, detail: "Unknown work" }; }
  async wait(id: string): Promise<WorkResult> { const started = Date.now(); while ((await this.status(id)).state === "running" && Date.now() - started < 2000) await new Promise((resolve) => setTimeout(resolve, 20)); if ((await this.status(id)).state !== "complete") throw new Error("Mock work failed"); this.events.emit("work:completed", { id }); return { id, output: new Uint8Array(), completedAt: Date.now() }; }
}
