import { describe, expect, it } from "vitest";
import { bytesToBase64 } from "../../src/jam/encoding";
import type { AccountAdapter, AccountInfo } from "../../src/jam/types";
import type { EventRuntime } from "../../src/runtime/types";
import { MiniJamApiError } from "../../src/runtime/minijam/MiniJamApiClient";
import { LiveWorkRuntime } from "../../src/runtime/minijam/LiveWorkRuntime";

const account: AccountInfo = { address: "5Alice", source: "test" };
const signer = { current: async () => account, connect: async () => account, disconnect: async () => undefined, sign: async () => "0xsigned" } as AccountAdapter;

function eventsFor(received: string[]) : EventRuntime { return { subscribe: () => () => undefined, emit: (event) => received.push(event) }; }

describe("live Work runtime", () => {
  it("submits, polls, and returns finalized operation output", async () => {
    let reads = 0;
    const api = {
      submitWork: async () => ({ operationId: "op-1", status: "submitted", request: { serviceId: "183" } }),
      getOperation: async () => { reads += 1; return reads === 1 ? { operationId: "op-1", status: "tracking_work", request: { serviceId: "183" } } : { operationId: "op-1", status: "succeeded", request: { serviceId: "183" }, result: { workId: 22, outputBase64: bytesToBase64(new Uint8Array([1, 2])), executionReceipt: "0xreceipt" } }; },
    };
    const received: string[] = [];
    const runtime = new LiveWorkRuntime(api as never, signer, eventsFor(received));
    const handle = await runtime.submit({ serviceId: "183", payload: new Uint8Array([9]) });
    const result = await runtime.wait(handle.id, { timeoutMs: 5_000 });
    expect(handle.id).toBe("op-1");
    expect(result).toMatchObject({ operationId: "op-1", workId: "22", serviceId: "183", receiptHash: "0xreceipt" });
    expect([...result.output]).toEqual([1, 2]);
    expect(received).toEqual(["work:submitted", "work:running", "work:completed"]);
  });

  it("emits failure and preserves the live error boundary", async () => {
    const api = { getOperation: async () => ({ operationId: "op-2", status: "failed", error: "invalid Computer request" }) };
    const received: string[] = [];
    const runtime = new LiveWorkRuntime(api as never, signer, eventsFor(received));
    await expect(runtime.wait("op-2")).rejects.toMatchObject({ code: "WORK_FAILED" });
    expect(received).toEqual(["work:failed"]);
  });

  it("requires an account before submitting work", async () => {
    const disconnected = { ...signer, current: async () => null } as AccountAdapter;
    const runtime = new LiveWorkRuntime({} as never, disconnected, eventsFor([]));
    await expect(runtime.submit({ serviceId: "183", payload: new Uint8Array() })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(new MiniJamApiError("TEST", "test")).toBeInstanceOf(Error);
  });
});
