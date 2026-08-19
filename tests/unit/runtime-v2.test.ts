import { describe, expect, it } from "vitest";
import { MockJamOsRuntime } from "../../src/runtime/mock/MockJamOsRuntime";

describe("JamOsRuntimeV2 mock adapter", () => {
  it("exposes the complete OS capability surface without network access", async () => {
    const runtime = new MockJamOsRuntime();
    expect(runtime.mode).toBe("mock");
    expect(await runtime.account.current()).toMatchObject({ address: "5MockJAMComputerAccount" });
    expect((await runtime.system.getInfo()).cpuUsage?.source).toBe("mock");
    expect((await runtime.network.getInfo()).source).toBe("mock");
    expect(await runtime.services.list()).toHaveLength(3);
    expect(await runtime.doom.status()).toBe("ready");
  });

  it("mounts the existing Computer Service filesystem behind fs", async () => {
    const runtime = new MockJamOsRuntime();
    const serviceId = await runtime.computer.create();
    const fs = runtime.fs.mount!(serviceId);
    await fs.write("/home/user/Documents/runtime-v2.txt", new TextEncoder().encode("hello"));
    expect(new TextDecoder().decode(await fs.read("/home/user/Documents/runtime-v2.txt"))).toBe("hello");
    expect((await fs.stat("/home/user/Documents/runtime-v2.txt"))?.type).toBe("file");
  });

  it("emits work lifecycle events from the mock adapter", async () => {
    const runtime = new MockJamOsRuntime();
    const events: string[] = [];
    runtime.events.subscribe("work:submitted", () => events.push("submitted"));
    runtime.events.subscribe("work:completed", () => events.push("completed"));
    const handle = await runtime.work.submit({ serviceId: "mock-service", payload: new Uint8Array() });
    await runtime.work.wait(handle.id);
    expect(events).toEqual(["submitted", "completed"]);
  });
});
