import { describe, expect, it } from "vitest";
import { encodeAddress } from "@polkadot/util-crypto";
import { createRunPermit, runPermitDigest } from "../../src/runtime/doom/runPermit";

describe("DOOM RunPermitV1", () => {
  it("signs the canonical AccountId32, not the SS58 display string", async () => {
    const accountBytes = new Uint8Array(32).fill(9);
    const address = encodeAddress(accountBytes, 42);
    let signedPayload = "";
    const account = {
      current: async () => ({ address }),
      connect: async () => ({ address }),
      disconnect: async () => undefined,
      sign: async (payload: string) => { signedPayload = payload; return `0x${"11".repeat(64)}`; },
    };
    const result = await createRunPermit(account, { address }, `0x${"22".repeat(32)}`, `0x${"33".repeat(32)}`);
    expect(result.permit.player).toEqual(accountBytes);
    expect(signedPayload).toBe(`0x${Array.from(runPermitDigest(result.permit), (byte) => byte.toString(16).padStart(2, "0")).join("")}`);
  });
});
