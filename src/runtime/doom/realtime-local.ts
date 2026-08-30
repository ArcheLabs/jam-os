import { renderDoomFrame } from "./frame";
import { DoomRuntimeError } from "./errors";
import type { DoomAction, DoomCheckpoint, DoomFrame, DoomInput, DoomRealtimeSession, DoomRealtimeStatus, DoomUnsubscribe, DoomRuntime, DoomState } from "./types";

const FRAME_INTERVAL_MS = 1000 / 30;
const ACTIONS: DoomAction[] = ["forward", "backward", "left", "right", "fire", "use", "weapon_next"];

function validateInput(input: DoomInput) {
  if (!Number.isSafeInteger(input.tick) || input.tick < 0 || !Array.isArray(input.actions) || input.actions.some((action) => !ACTIONS.includes(action))) throw new DoomRuntimeError("INVALID_INPUT", "Invalid realtime DOOM input");
}

/** Local realtime adapter used by Preview; the same input/frame contract is used by the gateway adapter. */
export class LocalDoomRealtimeSession implements DoomRealtimeSession {
  private currentStatus: DoomRealtimeStatus = "connecting";
  private currentState: DoomState | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;
  private readonly queued = new Map<number, DoomAction[]>();
  private readonly frameListeners = new Set<(frame: DoomFrame) => void>();
  private readonly readyPromise: Promise<void>;

  constructor(private readonly runtime: DoomRuntime, public readonly id: string) {
    this.readyPromise = this.initialize();
  }

  async ready() { return this.readyPromise; }
  status() { return this.currentStatus; }
  sendInput(input: DoomInput) {
    validateInput(input);
    if (this.currentStatus === "closed") throw new DoomRuntimeError("SESSION_FINISHED", "DOOM realtime session is closed");
    if (this.currentState && input.tick <= this.currentState.tick) throw new DoomRuntimeError("INVALID_TICK", "Realtime input must target a future tick");
    this.queued.set(input.tick, [...new Set(input.actions)]);
  }
  subscribeFrame(callback: (frame: DoomFrame) => void): DoomUnsubscribe { this.frameListeners.add(callback); return () => this.frameListeners.delete(callback); }
  async checkpoint(): Promise<DoomCheckpoint> {
    const state = await this.runtime.getState(this.id);
    return { sessionId: this.id, tick: state.tick, stateHash: state.stateHash, score: state.score, verified: false };
  }
  async pause() { if (this.currentStatus === "running") { this.clearTimer(); this.currentStatus = "paused"; } }
  async resume() { if (this.currentStatus === "paused") { this.currentStatus = "running"; this.startTimer(); } }
  async close() { this.clearTimer(); this.currentStatus = "closed"; this.frameListeners.clear(); }

  private async initialize() {
    this.currentState = await this.runtime.getState(this.id);
    this.currentStatus = "running";
    this.emitFrame();
    this.startTimer();
  }
  private startTimer() { if (!this.timer && this.currentStatus === "running") this.timer = setInterval(() => void this.step(), FRAME_INTERVAL_MS); }
  private clearTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  private async step() {
    if (this.inFlight || this.currentStatus !== "running" || !this.currentState) return;
    this.inFlight = true;
    try {
      const nextTick = this.currentState.tick + 1;
      const actions = this.queued.get(nextTick);
      if (actions) { await this.runtime.submitInput(this.id, { fromTick: nextTick, inputs: [{ tick: nextTick, actions }] }); this.queued.delete(nextTick); }
      await this.runtime.executeTicks(this.id, 1);
      this.currentState = await this.runtime.getState(this.id);
      this.emitFrame();
    } catch {
      this.currentStatus = "error";
      this.clearTimer();
    } finally { this.inFlight = false; }
  }
  private emitFrame() {
    if (!this.currentState) return;
    const frame = renderDoomFrame(this.id, this.currentState);
    this.frameListeners.forEach((listener) => listener(frame));
  }
}
