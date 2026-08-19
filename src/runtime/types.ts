import type { AccountInfo, AccountAdapter, JamClient, PlaygroundAdapter } from "../jam/types";
import type { ComputerService } from "../jam/computer";
import type { JamFileSystem } from "../jam/filesystem";
import type { JamNameService } from "../jam/names";

export type RuntimeMode = "mock" | "live";
export type RuntimeSource = "real" | "mock" | "unavailable";

export interface RuntimeMetric<T = number> {
  value: T;
  source: RuntimeSource;
}

export interface SystemInfo {
  osVersion: string;
  networkName: string;
  serviceId?: string;
  storageUsed?: RuntimeMetric<number>;
  storageTotal?: RuntimeMetric<number>;
  cpuUsage?: RuntimeMetric<number>;
  memoryUsage?: RuntimeMetric<number>;
  memoryTotal?: RuntimeMetric<number>;
  status: "booting" | "online" | "offline" | "degraded";
}

export interface FileEntry {
  path: string;
  type: "file" | "directory";
  size: number;
  updatedAt?: number;
  mime?: string;
}

export interface FileSystemRuntime {
  list(path: string): Promise<FileEntry[]>;
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  stat(path: string): Promise<FileEntry | null>;
  mount?(serviceId: string): FileSystemRuntime;
}

export interface ServiceInfo {
  id: string;
  name: string;
  status: "running" | "stopped" | "degraded";
  source: RuntimeSource;
}

export interface ServiceRuntime {
  list(): Promise<ServiceInfo[]>;
  inspect?(serviceId: string): Promise<unknown>;
  call?(serviceId: string, payload: Uint8Array, account?: AccountInfo | null): Promise<Uint8Array>;
}

export interface NetworkInfoV2 {
  name: string;
  endpoint: string;
  healthy: boolean;
  source: RuntimeSource;
  workCount?: number;
  eventCount?: number;
}

export interface NetworkRuntime {
  getInfo(): Promise<NetworkInfoV2>;
}

export interface WorkRequest {
  serviceId: string;
  payload: Uint8Array;
}

export interface WorkHandle { id: string; submittedAt: number; }
export interface WorkStatus { id: string; state: "queued" | "running" | "complete" | "failed"; detail?: string; }
export interface WorkResult { id: string; output: Uint8Array; completedAt: number; }
export interface WorkRuntime {
  submit(input: WorkRequest): Promise<WorkHandle>;
  status(workId: string): Promise<WorkStatus>;
  wait(workId: string): Promise<WorkResult>;
}

export interface NameRuntime {
  resolve(name: string): Promise<{ name: string; owner: string; serviceId: string }>;
  claim(name: string, serviceId: string): Promise<{ name: string; owner: string; serviceId: string }>;
  bind(name: string, serviceId: string): Promise<{ name: string; owner: string; serviceId: string }>;
}

export interface DoomStartOptions {
  map?: string;
  difficulty?: string;
}
export type DoomRuntimeStatus = "unavailable" | "ready" | "running";
export interface DoomInput { type: "key" | "mouse"; value: string; pressed?: boolean; }
export interface DoomSession {
  id: string;
  startedAt: number;
  mode: RuntimeMode;
  map?: string;
  difficulty?: string;
}
export interface DoomResult {
  sessionId: string;
  account: string;
  score: number;
  map: string;
  difficulty: string;
  kills: number;
  durationMs: number;
  finishedAt: number;
  completed: boolean;
  execution?: { serviceId: string; workId: string; receiptHash: string };
}
export interface DoomLeaderboardQuery { account?: string; limit?: number; }
export interface DoomLeaderboardEntry {
  id: string;
  account: string;
  displayName?: string;
  score: number;
  map: string;
  difficulty: string;
  kills: number;
  durationMs: number;
  completedAt: number;
  rulesetVersion: number;
  sessionId: string;
  runId: string;
  runtime: RuntimeMode;
  serviceId?: string;
  workId?: string;
  receiptHash?: string;
}
export interface DoomRuntime {
  status(): Promise<DoomRuntimeStatus>;
  start(options?: DoomStartOptions): Promise<DoomSession>;
  input(sessionId: string, input: DoomInput): Promise<void>;
  stop(sessionId: string): Promise<DoomResult>;
  leaderboard(query?: DoomLeaderboardQuery): Promise<DoomLeaderboardEntry[]>;
}

export interface EventRuntime {
  subscribe(event: string, callback: (payload: unknown) => void): () => void;
  emit?(event: string, payload: unknown): void;
}

export interface JamOsRuntimeV2 {
  mode: RuntimeMode;
  account: AccountAdapter;
  system: { getInfo(): Promise<SystemInfo> };
  fs: FileSystemRuntime;
  services: ServiceRuntime;
  work: WorkRuntime;
  network: NetworkRuntime;
  names: NameRuntime;
  doom: DoomRuntime;
  events: EventRuntime;
}

/** Transitional access for existing protocol adapters. UI code should prefer the V2 fields above. */
export interface RuntimeCompatibility {
  client: JamClient;
  computer: ComputerService;
  namesService: JamNameService;
  playground: PlaygroundAdapter;
}

export type AccountRuntime = JamOsRuntimeV2["account"];
export type { AccountInfo, AccountAdapter, JamClient, PlaygroundAdapter, ComputerService, JamFileSystem };
