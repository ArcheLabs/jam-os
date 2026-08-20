export const DOOM_RUNTIME_VERSION = "doom-runtime/1";
export const DOOM_RULESET_VERSION = 1;

export type DoomRuntimeStatus = "unavailable" | "ready" | "running";
export type DoomAction = "forward" | "backward" | "left" | "right" | "fire" | "use" | "weapon_next";

export interface DoomSessionOptions {
  sessionId?: string;
  map?: string;
  difficulty?: string;
  rulesetVersion?: number;
}

export interface DoomSession {
  id: string;
  runtimeVersion: string;
  rulesetVersion: number;
  map: string;
  difficulty: string;
  startedAt: number;
}

export interface DoomInput {
  tick: number;
  actions: DoomAction[];
}

export interface DoomInputBatch {
  fromTick: number;
  inputs: DoomInput[];
}

export interface DoomStateObject {
  id: string;
  kind: "player" | "enemy" | "item";
  x: number;
  y: number;
  alive: boolean;
}

export interface DoomServiceState {
  tick: number;
  stateHash: string;
  health: number;
  ammo: number;
  kills: number;
  score: number;
  completed: boolean;
}

export interface DoomState extends DoomServiceState {
  /** A small, stable summary used for verification; it is not the full engine state. */
  objects?: DoomStateObject[];
}

export interface DoomExecutionResult {
  sessionId: string;
  fromTick: number;
  toTick: number;
  stateHash: string;
  score: number;
}

export interface DoomResult {
  sessionId: string;
  account?: string;
  score: number;
  kills: number;
  durationTicks: number;
  completed: boolean;
  map: string;
  difficulty: string;
  runtimeVersion: string;
  rulesetVersion: number;
  finalStateHash: string;
  execution?: DoomExecutionReceipt;
}

export interface DoomExecutionReceipt {
  serviceId: string;
  workId: string;
  receiptHash?: string;
  stateHash: string;
  completedAt: number;
}

export type DoomRealtimeStatus = "connecting" | "running" | "paused" | "checkpointing" | "disconnected" | "closed" | "error";

export interface DoomFrame {
  sessionId: string;
  tick: number;
  width: number;
  height: number;
  /** RGBA pixels for rendering only; this is not canonical game state. */
  pixels: Uint8Array;
  stateHash?: string;
}

export interface DoomCheckpoint {
  sessionId: string;
  tick: number;
  stateHash: string;
  score: number;
  verified?: boolean;
  execution?: DoomExecutionReceipt;
}

export type DoomUnsubscribe = () => void;

export interface DoomRealtimeSession {
  id: string;
  status(): DoomRealtimeStatus;
  sendInput(input: DoomInput): void;
  subscribeFrame(callback: (frame: DoomFrame) => void): DoomUnsubscribe;
  checkpoint(): Promise<DoomCheckpoint>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
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
  durationTicks: number;
  completedAt: number;
  rulesetVersion: number;
  sessionId: string;
  runId: string;
  runtime: "mock" | "live";
  serviceId?: string;
  workId?: string;
  receiptHash?: string;
}

export interface DoomRuntime {
  status(): Promise<DoomRuntimeStatus>;
  createSession(options?: DoomSessionOptions): Promise<DoomSession>;
  submitInput(sessionId: string, input: DoomInputBatch): Promise<void>;
  executeTicks(sessionId: string, ticks: number): Promise<DoomExecutionResult>;
  getState(sessionId: string): Promise<DoomState>;
  finish(sessionId: string): Promise<DoomResult>;
  connectRealtime(sessionId: string): Promise<DoomRealtimeSession>;
  /** Local preview compatibility; no leaderboard service is part of Phase 3A. */
  leaderboard?(query?: DoomLeaderboardQuery): Promise<DoomLeaderboardEntry[]>;
}
