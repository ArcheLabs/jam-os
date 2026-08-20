import { describe, expect, it } from "vitest";
import { decodeState, encodeState, hashState } from "../../src/runtime/doom/hashing";
import { DOOM_RULESET_VERSION, DOOM_RUNTIME_VERSION } from "../../src/runtime/doom/types";
import { MockDoomRuntime } from "../../src/runtime/doom/MockDoomRuntime";

async function run(sequence: { tick: number; actions: ("forward" | "backward" | "left" | "right" | "fire" | "use")[] }[], rulesetVersion = DOOM_RULESET_VERSION) {
  const runtime = new MockDoomRuntime();
  const session = await runtime.createSession({ sessionId: "deterministic-session", rulesetVersion });
  await runtime.submitInput(session.id, { fromTick: 1, inputs: sequence });
  await runtime.executeTicks(session.id, 100);
  return { state: await runtime.getState(session.id), result: await runtime.finish(session.id) };
}

describe("deterministic DOOM runtime", () => {
  it("produces the same state hash and result for the same session and inputs", async () => {
    const input = [{ tick: 1, actions: ["forward"] as const }, { tick: 2, actions: ["fire"] as const }];
    const first = await run(input);
    const second = await run(input);
    expect(first.state.stateHash).toBe(second.state.stateHash);
    expect(first.result).toMatchObject({ score: second.result.score, kills: second.result.kills, finalStateHash: second.result.finalStateHash, runtimeVersion: DOOM_RUNTIME_VERSION, rulesetVersion: DOOM_RULESET_VERSION });
  });

  it("changes the state hash for different input", async () => {
    const first = await run([{ tick: 1, actions: ["forward"] }]);
    const second = await run([{ tick: 1, actions: ["backward"] }]);
    expect(first.state.stateHash).not.toBe(second.state.stateHash);
  });

  it("keeps ruleset versions explicit", async () => {
    const first = await run([{ tick: 1, actions: ["fire"] }], 1);
    const second = await run([{ tick: 1, actions: ["fire"] }], 2);
    expect(first.result.rulesetVersion).toBe(1);
    expect(second.result.rulesetVersion).toBe(2);
    expect(first.result.finalStateHash).not.toBe(second.result.finalStateHash);
  });

  it("isolates sessions and preserves state through canonical serialization", async () => {
    const runtime = new MockDoomRuntime();
    const first = await runtime.createSession({ sessionId: "session-a" });
    const second = await runtime.createSession({ sessionId: "session-b" });
    await runtime.submitInput(first.id, { fromTick: 1, inputs: [{ tick: 1, actions: ["forward"] }] });
    await runtime.executeTicks(first.id, 10);
    const firstState = await runtime.getState(first.id);
    const secondState = await runtime.getState(second.id);
    const restored = decodeState(encodeState(firstState));
    expect(secondState.tick).toBe(0);
    expect(restored).toEqual(firstState);
    expect(hashState(restored)).toBe(firstState.stateHash);
  });

  it("runs the complete Phase 3A lifecycle", async () => {
    const runtime = new MockDoomRuntime();
    const session = await runtime.createSession({ sessionId: "integration-session" });
    await runtime.submitInput(session.id, { fromTick: 1, inputs: [{ tick: 1, actions: ["fire"] }] });
    const execution = await runtime.executeTicks(session.id, 100);
    const state = await runtime.getState(session.id);
    const result = await runtime.finish(session.id);
    expect(execution.toTick).toBe(100);
    expect(state.stateHash).toBe(execution.stateHash);
    expect(result.finalStateHash).not.toBe("");
    expect(result.completed).toBe(true);
  });
});
