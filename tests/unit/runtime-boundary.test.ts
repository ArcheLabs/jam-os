import { describe, expect, it } from "vitest";
import { MiniJamRuntime } from "../../src/runtime/minijam/MiniJamRuntime";
import { MockJamOsRuntime } from "../../src/runtime/mock/MockJamOsRuntime";

describe("Phase 2 runtime boundary", () => {
  it("keeps live and mock adapters as parallel implementations", () => {
    const live = new MiniJamRuntime();
    expect(live).not.toBeInstanceOf(MockJamOsRuntime);
    expect(live.mode).toBe("live");
    expect(live.computer).toBeDefined();
    expect(live.playground).toBeDefined();
  });

  it("uses real filesystem and work paths without falling back to preview data", async () => {
    const live = new MiniJamRuntime();
    const mounted = live.fs.mount("183");
    await expect(mounted.list("/")).rejects.toMatchObject({ code: "NETWORK_UNAVAILABLE" });
    await expect(live.work.submit({ serviceId: "183", payload: new Uint8Array() })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("reports an unavailable live network instead of preview health", async () => {
    const live = new MiniJamRuntime();
    await expect(live.network.getInfo()).resolves.toMatchObject({ healthy: false, source: "unavailable" });
    await expect(live.system.getInfo()).resolves.toMatchObject({ status: "offline" });
  });

  it("reports live DOOM as unavailable rather than mock-ready", async () => {
    const live = new MiniJamRuntime();
    expect(await live.doom.status()).toBe("unavailable");
    await expect(live.doom.createSession()).rejects.toMatchObject({ code: "DOOM_RUNTIME_UNAVAILABLE" });
  });

  it("keeps preview fully usable through the V2 surface", async () => {
    const preview = new MockJamOsRuntime();
    const provisioned = await preview.computer.provision();
    const fs = preview.fs.mount(provisioned.serviceId);
    await fs.writeText("/home/user/Documents/preview.txt", "preview");
    expect(await fs.readText("/home/user/Documents/preview.txt")).toBe("preview");
    expect(await preview.doom.status()).toBe("ready");
  });
});
