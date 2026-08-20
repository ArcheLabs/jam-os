import { DoomRuntimeError } from "./errors";
import type { DoomExecutionResult, DoomInputBatch, DoomResult, DoomRuntime, DoomRuntimeStatus, DoomSession, DoomSessionOptions, DoomState } from "./types";

/** Phase 3A adapter boundary. The service Work call is intentionally reserved for Phase 3B. */
export class MiniJamDoomRuntime implements DoomRuntime {
  async status(): Promise<DoomRuntimeStatus> { return "unavailable"; }
  async createSession(_options?: DoomSessionOptions): Promise<DoomSession> { throw this.unavailable(); }
  async submitInput(_sessionId: string, _input: DoomInputBatch): Promise<void> { throw this.unavailable(); }
  async executeTicks(_sessionId: string, _ticks: number): Promise<DoomExecutionResult> { throw this.unavailable(); }
  async getState(_sessionId: string): Promise<DoomState> { throw this.unavailable(); }
  async finish(_sessionId: string): Promise<DoomResult> { throw this.unavailable(); }
  private unavailable() { return new DoomRuntimeError("DOOM_RUNTIME_UNAVAILABLE", "MiniJAM DOOM Service is not connected"); }
}
