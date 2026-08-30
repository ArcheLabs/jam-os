import { describe, expect, it } from "vitest";
import { decodeDoomFrame, encodeDoomFrame, serializeDoomInput } from "../../src/runtime/doom/frame";
import { MockDoomRuntime } from "../../src/runtime/doom/MockDoomRuntime";
import { WebSocketDoomRealtimeSession, type DoomTransport, type DoomTransportMessage } from "../../src/runtime/doom/realtime";
import type { DoomCheckpoint, DoomFrame } from "../../src/runtime/doom/types";

function wait(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

describe("DOOM realtime contracts", () => {
  it("serializes identical input to identical bytes", () => {
    const first = serializeDoomInput({ tick: 100, actions: ["fire", "forward"] });
    const second = serializeDoomInput({ tick: 100, actions: ["fire", "forward"] });
    expect([...first]).toEqual([...second]);
  });

  it("round-trips a fixed RGBA framebuffer", () => {
    const frame: DoomFrame = { sessionId: "frame-session", tick: 7, width: 2, height: 1, pixels: new Uint8Array([1, 2, 3, 255, 9, 8, 7, 255]), stateHash: "0xstate" };
    expect(decodeDoomFrame(encodeDoomFrame(frame))).toEqual(frame);
  });

  it("runs input, frames, pause/resume, checkpoint, and reconnect on the same session", async () => {
    const runtime = new MockDoomRuntime();
    const created = await runtime.createSession({ sessionId: "realtime-session" });
    const realtime = await runtime.connectRealtime(created.id);
    const frames: DoomFrame[] = [];
    const unsubscribe = realtime.subscribeFrame((frame) => frames.push(frame));
    realtime.sendInput({ tick: 1, actions: ["forward", "fire"] });
    await wait(85);
    const afterInput = await runtime.getState(created.id);
    expect(afterInput.tick).toBeGreaterThan(0);
    expect(afterInput.objects?.[0]).toMatchObject({ y: 1 });
    expect(frames.length).toBeGreaterThan(0);
    await realtime.pause();
    const pausedTick = (await runtime.getState(created.id)).tick;
    await wait(70);
    expect((await runtime.getState(created.id)).tick).toBe(pausedTick);
    await realtime.resume();
    await wait(50);
    const checkpoint = await realtime.checkpoint();
    expect(checkpoint).toMatchObject({ sessionId: created.id, stateHash: expect.any(String), score: expect.any(Number) });
    await realtime.close();
    unsubscribe();
    const reopened = await runtime.connectRealtime(created.id);
    await expect(reopened.checkpoint()).resolves.toMatchObject({ tick: (await runtime.getState(created.id)).tick });
    await reopened.close();
  });

  it("serializes gateway input and resolves a checkpoint response", async () => {
    const sent: DoomTransportMessage[] = [];
    let listener: ((message: DoomTransportMessage) => void) | null = null;
    const transport: DoomTransport = {
      connect: async () => undefined,
      send: (message) => sent.push(message),
      subscribe: (callback) => { listener = callback; return () => { listener = null; }; },
      close: async () => undefined,
    };
    const session = new WebSocketDoomRealtimeSession(transport, "gateway-session");
    await session.connect();
    session.sendInput({ tick: 4, actions: ["weapon_next"] });
    expect(sent[0]).toContain('"type":"input"');
    const checkpointPromise = session.checkpoint();
    const checkpoint: DoomCheckpoint = { sessionId: "gateway-session", tick: 4, stateHash: "0xhash", score: 10, verified: true };
    listener?.(JSON.stringify({ version: 1, type: "checkpoint", checkpoint }));
    await expect(checkpointPromise).resolves.toEqual(checkpoint);
    await session.close();
  });
});
