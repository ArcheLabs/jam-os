import { describe, expect, it } from "vitest";
import { isJamBridgeMessage } from "../../src/apps/browser/bridge";
describe("JAM Web bridge validation", () => {
  it("accepts navigation and rejects privileged or unsafe payloads", () => {
    expect(isJamBridgeMessage({ type: "jam:navigate", href: "jam://alice" })).toBe(true);
    expect(isJamBridgeMessage({ type: "jam:navigate", href: "javascript:alert(1)" })).toBe(false);
    expect(isJamBridgeMessage({ type: "jam:call", action: "increment", requestId: "1" })).toBe(true);
    expect(isJamBridgeMessage({ type: "jam:call", action: "x" })).toBe(false);
  });
});
