import type { AccountInfo, AccountAdapter, CompileInput, CompileOutput, DeployInput, DeployOutput, InteractInput, InteractOutput } from "../jam/types";
import type { ProvisionProgress, ProvisionedComputer } from "../jam/computer";
import type { DoomRuntime } from "./doom/types";
import type { ContentProvider } from "../jam/contentProvider";

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
export interface FileManifest { files: Record<string, { path?: string }> | Array<{ path: string }>; }

export interface FileSystemRuntime {
  list(path: string): Promise<FileEntry[]>;
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array, options?: { mime?: string }): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string, options?: { recursive?: boolean }): Promise<void>;
  stat(path: string): Promise<FileEntry | null>;
  readText(path: string): Promise<string>;
  writeText(path: string, content: string, mime?: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  publish(path?: string): Promise<FileManifest>;
  manifest(): Promise<FileManifest | null>;
  readPublished(path: string): Promise<{ bytes: Uint8Array; mime: string }>;
  mount(serviceId: string): FileSystemRuntime;
}

export interface ComputerRuntime {
  current(): Promise<ProvisionedComputer | null>;
  provision(onProgress?: (progress: ProvisionProgress) => void): Promise<ProvisionedComputer>;
  inspect(serviceId: string): Promise<unknown>;
}

export interface PlaygroundRuntime {
  compile(input: CompileInput): Promise<CompileOutput>;
  deploy(input: DeployInput): Promise<DeployOutput>;
  interact(input: InteractInput): Promise<InteractOutput>;
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
export interface WorkResult { id: string; output: Uint8Array; completedAt: number; serviceId?: string; workId?: string; operationId?: string; receiptHash?: string; }
export interface WorkWaitOptions { signal?: AbortSignal; timeoutMs?: number; }
export interface WorkRuntime {
  submit(input: WorkRequest): Promise<WorkHandle>;
  status(workId: string): Promise<WorkStatus>;
  wait(workId: string, options?: WorkWaitOptions): Promise<WorkResult>;
}

export interface NameRuntime {
  resolve(name: string): Promise<{ name: string; owner: string; serviceId: string }>;
  claim(name: string, serviceId: string): Promise<{ name: string; owner: string; serviceId: string }>;
  bind(name: string, serviceId: string): Promise<{ name: string; owner: string; serviceId: string }>;
}

export interface EventRuntime {
  subscribe(event: string, callback: (payload: unknown) => void): () => void;
  emit?(event: string, payload: unknown): void;
}

export interface JamOsRuntimeV2 {
  mode: RuntimeMode;
  account: AccountAdapter;
  computer: ComputerRuntime;
  system: { getInfo(): Promise<SystemInfo> };
  fs: FileSystemRuntime;
  playground: PlaygroundRuntime;
  services: ServiceRuntime;
  work: WorkRuntime;
  network: NetworkRuntime;
  names: NameRuntime;
  doom: DoomRuntime;
  events: EventRuntime;
  content?: ContentProvider;
}

export type AccountRuntime = JamOsRuntimeV2["account"];
export type { AccountInfo, AccountAdapter };
export type { DoomAction, DoomCheckpoint, DoomExecutionReceipt, DoomExecutionResult, DoomFrame, DoomInput, DoomInputBatch, DoomLeaderboardEntry, DoomLeaderboardQuery, DoomRealtimeSession, DoomRealtimeStatus, DoomResult, DoomRuntime, DoomRuntimeStatus, DoomServiceState, DoomSession, DoomSessionOptions, DoomState } from "./doom/types";
