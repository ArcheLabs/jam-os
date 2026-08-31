import type { AccountAdapter } from "../../jam/types";
import type { DoomRuntime, DoomRuntimeStatus, DoomSession, DoomSessionOptions, DoomRealtimeSession, DoomInputBatch, DoomExecutionResult, DoomState, DoomResult, DoomLeaderboardQuery, DoomLeaderboardEntry } from "./types";
import { DoomRuntimeError } from "./errors";
import { createRunPermit, permitJson } from "./runPermit";
import { WebSocketDoomRealtimeSession, WebSocketDoomTransport } from "./realtime";

/** Live DOOM adapter. Gameplay is owned by the runner's long-lived PolkaVM;
 * no MiniJAM Work is submitted for start, input, ticks, or frames. */
export class RealDoomRunnerRuntime implements DoomRuntime {
  private readonly permits = new Map<string, ReturnType<typeof permitJson>>();
  constructor(private readonly account: AccountAdapter, private readonly gatewayUrl?: string, private readonly runnerDomain = "", private readonly rulesetHash = "") {}
  async status(): Promise<DoomRuntimeStatus> {
    if (!this.gatewayUrl) return "unavailable";
    try { const response = await fetch(`${this.gatewayUrl.replace(/\/$/, "")}/health/ready`); return response.ok ? "ready" : "unavailable"; } catch { return "unavailable"; }
  }
  async createSession(options: DoomSessionOptions = {}): Promise<DoomSession> {
    if (options.map && options.map !== "E1M1") throw new DoomRuntimeError("INVALID_INPUT", "Alpha DOOM is fixed to E1M1");
    if (options.difficulty && options.difficulty !== "Hurt Me Plenty") throw new DoomRuntimeError("INVALID_INPUT", "Alpha DOOM is fixed to skill 3");
    if (!this.gatewayUrl || !this.runnerDomain || !this.rulesetHash) throw new DoomRuntimeError("SERVICE_UNAVAILABLE", "DOOM Runner is not configured");
    const info = await this.account.current(); if (!info) throw new DoomRuntimeError("SERVICE_UNAVAILABLE", "Connect a Polkadot account before starting DOOM");
    const signed = await createRunPermit(this.account, info, this.runnerDomain, this.rulesetHash);
    const id = `0x${Array.from(signed.permit.runId, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    this.permits.set(id, permitJson(signed));
    return { id, runtimeVersion: "polkadoom-runner/1", rulesetVersion: 1, map: "E1M1", difficulty: "Hurt Me Plenty", startedAt: Date.now() };
  }
  async connectRealtime(runId: string): Promise<DoomRealtimeSession> {
    const permit = this.permits.get(runId); if (!permit || !this.gatewayUrl) throw new DoomRuntimeError("SERVICE_UNAVAILABLE", "DOOM Run permit is missing or Runner is unavailable");
    const transport = new WebSocketDoomTransport(this.gatewayUrl, permit);
    const session = new WebSocketDoomRealtimeSession(transport, runId); await session.connect(); return session;
  }
  async submitInput(_runId: string, _input: DoomInputBatch): Promise<void> { throw new DoomRuntimeError("INVALID_INPUT", "Live DOOM input is sent directly to the Runner WebSocket"); }
  async executeTicks(): Promise<DoomExecutionResult> { throw new DoomRuntimeError("INVALID_INPUT", "Live DOOM ticks are owned by PolkaVM Runner"); }
  async getState(): Promise<DoomState> { throw new DoomRuntimeError("SERVICE_UNAVAILABLE", "Live DOOM state is streamed by the Runner"); }
  async finish(): Promise<DoomResult> { throw new DoomRuntimeError("EXECUTION_FAILED", "Live DOOM finalization is returned by the Runner"); }
  async leaderboard(_query?: DoomLeaderboardQuery): Promise<DoomLeaderboardEntry[]> { return []; }
}
