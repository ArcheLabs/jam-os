import type { AccountAdapter } from "../../jam/types";
import type { EventRuntime } from "../types";
import { deterministicRandom, hashState } from "./hashing";
import { DoomRuntimeError } from "./errors";
import { DOOM_RULESET_VERSION, DOOM_RUNTIME_VERSION, type DoomAction, type DoomExecutionResult, type DoomInputBatch, type DoomLeaderboardEntry, type DoomLeaderboardQuery, type DoomResult, type DoomRuntime, type DoomRuntimeStatus, type DoomSession, type DoomSessionOptions, type DoomState, type DoomStateObject } from "./types";
import { SCORE_PER_KILL, SCORE_PER_USE, scoreForState } from "./scoring";

interface InternalState extends DoomState { objects: DoomStateObject[]; x: number; y: number; }
interface SessionRecord { session: DoomSession; state: InternalState; inputs: Map<number, DoomAction[]>; finished: boolean; }

function initialState(): InternalState {
  const state = { tick: 0, stateHash: "", health: 100, ammo: 50, kills: 0, score: 0, completed: false, objects: [{ id: "player", kind: "player" as const, x: 0, y: 0, alive: true }], x: 0, y: 0 };
  state.stateHash = hashState(state, state.objects);
  return state;
}

function validAction(action: string): action is DoomAction { return ["forward", "backward", "left", "right", "fire", "use"].includes(action); }

export class MockDoomRuntime implements DoomRuntime {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly results: DoomResult[] = [];
  private nextSession = 1;
  constructor(private readonly account?: AccountAdapter, private readonly events?: EventRuntime) {}

  async status(): Promise<DoomRuntimeStatus> { return [...this.sessions.values()].some((record) => !record.finished) ? "running" : "ready"; }

  async createSession(options: DoomSessionOptions = {}): Promise<DoomSession> {
    const id = options.sessionId || `mock-session-${this.nextSession++}`;
    if (this.sessions.has(id)) throw new DoomRuntimeError("INVALID_INPUT", `DOOM session ${id} already exists`);
    const session = { id, runtimeVersion: DOOM_RUNTIME_VERSION, rulesetVersion: options.rulesetVersion || DOOM_RULESET_VERSION, map: options.map || "E1M1", difficulty: options.difficulty || "Hurt Me Plenty", startedAt: 0 };
    this.sessions.set(id, { session, state: initialState(), inputs: new Map(), finished: false });
    this.events?.emit?.("doom:session-created", session);
    return { ...session };
  }

  async submitInput(sessionId: string, batch: DoomInputBatch): Promise<void> {
    const record = this.get(sessionId);
    if (record.finished) throw new DoomRuntimeError("SESSION_FINISHED", `DOOM session ${sessionId} has finished`);
    if (!Number.isSafeInteger(batch.fromTick) || batch.fromTick < 0) throw new DoomRuntimeError("INVALID_INPUT", "Input batch fromTick must be a non-negative integer");
    let previous = batch.fromTick - 1;
    for (const input of batch.inputs) {
      if (!Number.isSafeInteger(input.tick) || input.tick < batch.fromTick || input.tick <= previous || input.tick <= record.state.tick) throw new DoomRuntimeError("INVALID_TICK", `Input tick ${input.tick} is not strictly after the previous tick`);
      if (input.actions.some((action) => !validAction(action))) throw new DoomRuntimeError("INVALID_INPUT", "Input contains an unsupported DOOM action");
      record.inputs.set(input.tick, [...input.actions]);
      previous = input.tick;
    }
  }

  async executeTicks(sessionId: string, ticks: number): Promise<DoomExecutionResult> {
    const record = this.get(sessionId);
    if (record.finished) throw new DoomRuntimeError("SESSION_FINISHED", `DOOM session ${sessionId} has finished`);
    if (!Number.isSafeInteger(ticks) || ticks < 0) throw new DoomRuntimeError("INVALID_TICK", "Ticks must be a non-negative integer");
    const fromTick = record.state.tick;
    for (let index = 0; index < ticks; index += 1) this.step(record);
    const result = { sessionId, fromTick, toTick: record.state.tick, stateHash: record.state.stateHash, score: scoreForState(record.state) };
    this.events?.emit?.("doom:executed", result);
    return result;
  }

  async getState(sessionId: string): Promise<DoomState> { const record = this.get(sessionId); return this.publicState(record.state); }

  async finish(sessionId: string): Promise<DoomResult> {
    const record = this.get(sessionId);
    if (record.finished) throw new DoomRuntimeError("SESSION_FINISHED", `DOOM session ${sessionId} has finished`);
    record.finished = true;
    record.state.completed = true;
    record.state.stateHash = hashState(record.state, record.state.objects);
    const account = await this.account?.current();
    const result = { sessionId, account: account?.address, score: record.state.score, kills: record.state.kills, durationTicks: record.state.tick, completed: true, map: record.session.map, difficulty: record.session.difficulty, runtimeVersion: record.session.runtimeVersion, rulesetVersion: record.session.rulesetVersion, finalStateHash: record.state.stateHash };
    this.results.unshift(result);
    this.events?.emit?.("doom:finished", result);
    return result;
  }

  async leaderboard(query: DoomLeaderboardQuery = {}): Promise<DoomLeaderboardEntry[]> {
    const account = (await this.account?.current())?.address || "5MockJAMComputerAccount";
    const values = this.results.map((result) => ({ id: `mock-result-${result.sessionId}`, account: result.account || account, displayName: "You", score: result.score, map: result.map, difficulty: result.difficulty, kills: result.kills, durationTicks: result.durationTicks, completedAt: 0, rulesetVersion: result.rulesetVersion, sessionId: result.sessionId, runId: `mock-run-${result.sessionId}`, runtime: "mock" as const }));
    return values.filter((entry) => !query.account || entry.account === query.account).sort((a, b) => b.score - a.score).slice(0, query.limit || 20).map((entry, index) => ({ ...entry, rank: index + 1 } as DoomLeaderboardEntry & { rank: number }));
  }

  private get(sessionId: string) { const record = this.sessions.get(sessionId); if (!record) throw new DoomRuntimeError("SESSION_NOT_FOUND", `DOOM session ${sessionId} was not found`); return record; }
  private step(record: SessionRecord) {
    const nextTick = record.state.tick + 1;
    const actions = record.inputs.get(nextTick) || [];
    for (const action of actions) {
      if (action === "forward") record.state.y += 1;
      if (action === "backward") record.state.y -= 1;
      if (action === "left") record.state.x -= 1;
      if (action === "right") record.state.x += 1;
      if (action === "use") record.state.health = Math.min(100, record.state.health + 1);
      if (action === "fire" && record.state.ammo > 0) {
        record.state.ammo -= 1;
        if (deterministicRandom(record.session.id + record.session.rulesetVersion, nextTick, "fire") >= 0.5) {
          record.state.kills += 1;
          record.state.score += SCORE_PER_KILL;
        }
      }
    }
    if (actions.includes("use")) record.state.score += SCORE_PER_USE;
    if (deterministicRandom(record.session.id + record.session.rulesetVersion, nextTick, "damage") < 0.01) record.state.health = Math.max(0, record.state.health - 1);
    record.state.tick = nextTick;
    record.state.objects[0] = { ...record.state.objects[0], x: record.state.x, y: record.state.y, alive: record.state.health > 0 };
    record.state.stateHash = hashState(record.state, record.state.objects);
  }
  private publicState(state: InternalState): DoomState { return { tick: state.tick, stateHash: state.stateHash, health: state.health, ammo: state.ammo, kills: state.kills, score: state.score, completed: state.completed, objects: state.objects.map((object) => ({ ...object })) }; }
}
