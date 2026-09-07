import type { DoomExecutionResult, DoomInputBatch, DoomLeaderboardEntry, DoomLeaderboardQuery, DoomResult, DoomRuntime, DoomRuntimeStatus, DoomSession, DoomSessionOptions, DoomState, DoomRealtimeSession } from "./types";
import { DoomRuntimeError } from "./errors";

/** Stage-1 keeps the research surface typed but unavailable until official CoreVM support exists. */
export class DeferredDoomRuntime implements DoomRuntime {
  status(): Promise<DoomRuntimeStatus> { return Promise.resolve("unavailable"); }
  private unavailable<T>(): Promise<T> { return Promise.reject(new DoomRuntimeError("SERVICE_UNAVAILABLE", "DOOM is deferred pending the official JAM CoreVM")); }
  createSession(_options?: DoomSessionOptions): Promise<DoomSession> { return this.unavailable(); }
  submitInput(_sessionId: string, _input: DoomInputBatch): Promise<void> { return this.unavailable(); }
  executeTicks(_sessionId: string, _ticks: number): Promise<DoomExecutionResult> { return this.unavailable(); }
  getState(_sessionId: string): Promise<DoomState> { return this.unavailable(); }
  finish(_sessionId: string): Promise<DoomResult> { return this.unavailable(); }
  connectRealtime(_sessionId: string): Promise<DoomRealtimeSession> { return this.unavailable(); }
  leaderboard(_query?: DoomLeaderboardQuery): Promise<DoomLeaderboardEntry[]> { return Promise.resolve([]); }
}
