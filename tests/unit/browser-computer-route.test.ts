import { describe, expect, it } from "vitest";
import { resolveBrowserUrl } from "../../src/apps/browser/protocolRouter";

describe("public Computer profile route", () => {
  it("resolves https://computer.minijam.xyz/@name through JNS as read-only UI", async () => {
    const document = await resolveBrowserUrl("https://computer.minijam.xyz/@Alice", {
      localFs: null,
      names: {
        resolve: async (name) => ({ name, owner: "alice-owner", serviceId: "42" }),
        claim: async () => ({ name: "alice", owner: "alice-owner", serviceId: "42" }),
        bind: async () => ({ name: "alice", owner: "alice-owner", serviceId: "42" }),
      },
      siteForService: () => ({ readPublished: async () => ({ bytes: new Uint8Array(), mime: "text/plain" }), manifest: async () => null }),
    });
    expect(document.mode).toBe("internal");
    expect(document.jam).toMatchObject({ name: "alice", serviceId: "42" });
    expect(document.srcdoc).toContain("READ-ONLY GUEST VIEW");
  });
});
