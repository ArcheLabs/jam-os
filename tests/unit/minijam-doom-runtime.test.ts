import { describe, expect, it } from "vitest";
import { MiniJamApiError } from "../../src/runtime/minijam/MiniJamApiClient";
import { MiniJamDoomRuntime } from "../../src/runtime/doom/MiniJamDoomRuntime";
import type { DoomState } from "../../src/runtime/doom/types";
import type { WorkRequest } from "../../src/runtime/types";

function state(sessionId: string, tick = 0, score = 0, completed = false): DoomState { return { tick, stateHash: `0xstate-${tick}-${score}-${completed}`, health: 100, ammo: 50, kills: score ? 1 : 0, score, completed }; }

function fakeLive() {
  const storage = new Map<string, Uint8Array>();
  const put = (key: string, value: unknown) => storage.set(key, new TextEncoder().encode(JSON.stringify(value)));
  const work: { submit(input: WorkRequest): Promise<{ id: string; submittedAt: number }>; wait(id: string): Promise<{ id: string; output: Uint8Array; completedAt: number; serviceId: string; workId: string; receiptHash: string }> } = {
    async submit(input) {
      const request = JSON.parse(new TextDecoder().decode(input.payload)) as { op: string; sessionId: string; ticks?: number };
      const prefix = `doom:session:${request.sessionId}`;
      const current = storage.get(`${prefix}:state`);
      const previous = current ? JSON.parse(new TextDecoder().decode(current)) as DoomState : null;
      if (request.op === "create_session") put(`${prefix}:state`, state(request.sessionId));
      if (request.op === "input") put(`${prefix}:inputs`, request);
      if (request.op === "execute") put(`${prefix}:state`, state(request.sessionId, (previous?.tick || 0) + (request.ticks || 0), 1000));
      if (request.op === "finish") { const final = state(request.sessionId, previous?.tick || 0, previous?.score || 0, true); put(`${prefix}:state`, final); put(`${prefix}:result`, { sessionId: request.sessionId, ...final, durationTicks: final.tick, finalStateHash: final.stateHash, map: "E1M1", difficulty: "normal", runtimeVersion: "doom-service/1", rulesetVersion: 1 }); }
      return { id: `operation-${request.op}`, submittedAt: 1 };
    },
    async wait(id) { return { id, output: new Uint8Array(), completedAt: 2, serviceId: "7", workId: `work-${id}`, receiptHash: "0xreceipt" }; },
  };
  const api = { getService: async () => ({ serviceId: 7, controller: "5Alice", codeHash: "0xcode", codeLength: 1, preimageReady: true, finalizedBlock: "0xblock", finalizedBlockNumber: 1 }), getStorage: async (serviceId: string, key: string) => serviceId === "7" ? storage.get(key) || null : null };
  return { api, work };
}

describe("MiniJAM DOOM runtime adapter", () => {
  it("runs create, input, execute, state, and finish through Work", async () => {
    const fake = fakeLive();
    const runtime = new MiniJamDoomRuntime({ api: fake.api as never, work: fake.work, serviceId: "7" });
    const session = await runtime.createSession({ sessionId: "recovery-session" });
    await runtime.submitInput(session.id, { fromTick: 1, inputs: [{ tick: 1, actions: ["fire"] }] });
    const execution = await runtime.executeTicks(session.id, 100);
    const state = await runtime.getState(session.id);
    const result = await runtime.finish(session.id);
    const finalState = await runtime.getState(session.id);
    expect(execution).toMatchObject({ fromTick: 0, toTick: 100, score: 1000 });
    expect(state.tick).toBe(100);
    expect(result).toMatchObject({ completed: true, finalStateHash: finalState.stateHash, execution: { serviceId: "7", receiptHash: "0xreceipt" } });
  });

  it("recovers state from service storage without browser state", async () => {
    const fake = fakeLive();
    const first = new MiniJamDoomRuntime({ api: fake.api as never, work: fake.work, serviceId: "7" });
    await first.createSession({ sessionId: "persisted-session" });
    const reopened = new MiniJamDoomRuntime({ api: fake.api as never, work: fake.work, serviceId: "7" });
    await expect(reopened.getState("persisted-session")).resolves.toMatchObject({ tick: 0 });
  });

  it("maps missing service state and Work timeout to stable runtime errors", async () => {
    const fake = fakeLive();
    const runtime = new MiniJamDoomRuntime({ api: fake.api as never, work: { submit: fake.work.submit, wait: async () => { throw new MiniJamApiError("WORK_TIMEOUT", "timeout"); } }, serviceId: "7" });
    await expect(runtime.getState("missing")).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });
    await expect(runtime.createSession({ sessionId: "timeout" })).rejects.toMatchObject({ code: "WORK_TIMEOUT" });
  });

  it("rejects invalid input before submitting a Work", async () => {
    const fake = fakeLive();
    let submitted = false;
    const runtime = new MiniJamDoomRuntime({
      api: fake.api as never,
      work: { submit: async (request) => { submitted = true; return fake.work.submit(request); }, wait: fake.work.wait },
      serviceId: "7",
    });
    await expect(runtime.submitInput("missing", { fromTick: 0, inputs: [{ tick: 0, actions: ["teleport" as never] }] })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(submitted).toBe(false);
  });
});
