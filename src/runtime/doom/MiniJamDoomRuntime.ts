import { jsonBytes } from "../../jam/JamClient";
import type { MiniJamApiClient } from "../minijam/MiniJamApiClient";
import { MiniJamApiError } from "../minijam/MiniJamApiClient";
import type { WorkResult, WorkRuntime } from "../types";
import { DoomRuntimeError } from "./errors";
import { createSessionRequest, executeRequest, finishRequest, inputRequest } from "./protocol";
import { WebSocketDoomRealtimeSession, WebSocketDoomTransport } from "./realtime";
import { DOOM_RULESET_VERSION, DOOM_RUNTIME_VERSION, type DoomExecutionReceipt, type DoomExecutionResult, type DoomInput, type DoomInputBatch, type DoomResult, type DoomRuntime, type DoomRuntimeStatus, type DoomSession, type DoomSessionOptions, type DoomState } from "./types";

export interface MiniJamDoomRuntimeOptions {
  api: MiniJamApiClient;
  work: WorkRuntime;
  serviceId?: string;
  gatewayUrl?: string;
}

function parse<T>(bytes: Uint8Array | null, description: string): T {
  if (!bytes) throw new DoomRuntimeError("SESSION_NOT_FOUND", `${description} was not found in finalized Service storage`);
  try { return JSON.parse(new TextDecoder().decode(bytes)) as T; } catch { throw new DoomRuntimeError("INVALID_RECEIPT", `${description} returned invalid JSON`); }
}

function mapError(error: unknown): DoomRuntimeError {
  if (error instanceof DoomRuntimeError) return error;
  if (error instanceof MiniJamApiError) {
    if (error.code === "WORK_TIMEOUT") return new DoomRuntimeError("WORK_TIMEOUT", error.message);
    if (error.code === "WORK_FAILED") return new DoomRuntimeError("EXECUTION_FAILED", error.message);
    if (error.code === "NOT_FOUND") return new DoomRuntimeError("SESSION_NOT_FOUND", error.message);
    if (error.code === "UNAUTHORIZED" || error.code === "SIGNATURE_REJECTED") return new DoomRuntimeError("SERVICE_UNAVAILABLE", error.message);
    return new DoomRuntimeError("SERVICE_UNAVAILABLE", error.message);
  }
  return new DoomRuntimeError("EXECUTION_FAILED", error instanceof Error ? error.message : "DOOM Work failed");
}

function validateBatch(batch: DoomInputBatch) {
  if (!Number.isSafeInteger(batch.fromTick) || batch.fromTick < 0) throw new DoomRuntimeError("INVALID_INPUT", "Input batch fromTick must be a non-negative integer");
  let previous = batch.fromTick - 1;
  for (const input of batch.inputs) {
    if (!Number.isSafeInteger(input.tick) || input.tick < batch.fromTick || input.tick <= previous) throw new DoomRuntimeError("INVALID_INPUT", `Input tick ${input.tick} is not strictly ordered`);
    if (input.actions.some((action) => !["forward", "backward", "left", "right", "fire", "use", "weapon_next"].includes(action))) throw new DoomRuntimeError("INVALID_INPUT", "Input contains an unsupported DOOM action");
    previous = input.tick;
  }
}

export class MiniJamDoomRuntime implements DoomRuntime {
  private readonly receipts = new Map<string, DoomExecutionReceipt>();
  private nextSession = 1;
  constructor(private readonly options: MiniJamDoomRuntimeOptions) {}

  async status(): Promise<DoomRuntimeStatus> {
    if (!this.options.serviceId) return "unavailable";
    try { await this.options.api.getService(this.options.serviceId); return "ready"; } catch { return "unavailable"; }
  }

  async createSession(options: DoomSessionOptions = {}): Promise<DoomSession> {
    const serviceId = this.serviceId();
    const session = { id: options.sessionId || `doom-session-${this.nextSession++}`, runtimeVersion: DOOM_RUNTIME_VERSION, rulesetVersion: options.rulesetVersion || DOOM_RULESET_VERSION, map: options.map || "E1M1", difficulty: options.difficulty || "normal", startedAt: Date.now() };
    try {
      const work = await this.executeWork(serviceId, createSessionRequest(session.id, session.map, session.difficulty, session.rulesetVersion, session.runtimeVersion));
      const state = await this.getState(session.id);
      this.recordReceipt(session.id, state.stateHash, work);
      return session;
    } catch (error) { throw mapError(error); }
  }

  async submitInput(sessionId: string, input: DoomInputBatch): Promise<void> {
    validateBatch(input);
    try { await this.getState(sessionId); await this.executeWork(this.serviceId(), inputRequest(sessionId, input.inputs)); } catch (error) { throw mapError(error); }
  }

  async executeTicks(sessionId: string, ticks: number): Promise<DoomExecutionResult> {
    if (!Number.isSafeInteger(ticks) || ticks < 0) throw new DoomRuntimeError("INVALID_INPUT", "Ticks must be a non-negative integer");
    try {
      const before = await this.getState(sessionId);
      const work = await this.executeWork(this.serviceId(), executeRequest(sessionId, ticks));
      const after = await this.getState(sessionId);
      this.recordReceipt(sessionId, after.stateHash, work);
      return { sessionId, fromTick: before.tick, toTick: after.tick, stateHash: after.stateHash, score: after.score };
    } catch (error) { throw mapError(error); }
  }

  async getState(sessionId: string): Promise<DoomState> {
    try { return parse<DoomState>(await this.options.api.getStorage(this.serviceId(), this.key("state", sessionId)), `DOOM session ${sessionId} state`); } catch (error) { throw mapError(error); }
  }

  async finish(sessionId: string): Promise<DoomResult> {
    try {
      const work = await this.executeWork(this.serviceId(), finishRequest(sessionId));
      const state = await this.getState(sessionId);
      const stored = parse<Partial<DoomResult>>(await this.options.api.getStorage(this.serviceId(), this.key("result", sessionId)), `DOOM session ${sessionId} result`);
      const receipt = this.recordReceipt(sessionId, state.stateHash, work);
      if (stored.finalStateHash && stored.finalStateHash !== state.stateHash) throw new DoomRuntimeError("INVALID_RECEIPT", "DOOM result does not match finalized state");
      return { sessionId, account: stored.account, score: stored.score ?? state.score, kills: stored.kills ?? state.kills, durationTicks: stored.durationTicks ?? state.tick, completed: stored.completed ?? state.completed, map: stored.map || "E1M1", difficulty: stored.difficulty || "normal", runtimeVersion: stored.runtimeVersion || DOOM_RUNTIME_VERSION, rulesetVersion: stored.rulesetVersion || DOOM_RULESET_VERSION, finalStateHash: stored.finalStateHash || state.stateHash, execution: receipt };
    } catch (error) { throw mapError(error); }
  }

  async connectRealtime(sessionId: string) {
    if (!this.options.gatewayUrl) throw new DoomRuntimeError("SERVICE_UNAVAILABLE", "VITE_DOOM_GATEWAY_URL is not configured");
    try {
      await this.getState(sessionId);
      const realtime = new WebSocketDoomRealtimeSession(new WebSocketDoomTransport(this.options.gatewayUrl), sessionId);
      await realtime.connect();
      return realtime;
    } catch (error) { throw mapError(error); }
  }

  private serviceId() { if (!this.options.serviceId) throw new DoomRuntimeError("SERVICE_UNAVAILABLE", "VITE_DOOM_SERVICE_ID is not configured"); return this.options.serviceId; }
  private key(kind: "state" | "inputs" | "result", sessionId: string) { return `doom:session:${sessionId}:${kind}`; }
  private async executeWork(serviceId: string, request: object): Promise<WorkResult> { try { const handle = await this.options.work.submit({ serviceId, payload: jsonBytes(request) }); return await this.options.work.wait(handle.id); } catch (error) { throw mapError(error); } }
  private recordReceipt(sessionId: string, stateHash: string, result: WorkResult): DoomExecutionReceipt { const receipt = { serviceId: result.serviceId || this.serviceId(), workId: result.workId || result.operationId || result.id, receiptHash: result.receiptHash, stateHash, completedAt: result.completedAt }; this.receipts.set(sessionId, receipt); return receipt; }
}
