import { describe, expect, it } from "vitest";
import { decodeDoomVerifyWork, doomRunClaimDigest, doomSignatureBytes, encodeDoomVerifyWork, verifyDoomRunClaim } from "../../src/runtime/doom/claim";

describe("DoomRunClaimV1 and DoomVerifyWorkV1", () => {
  it("binds player, ruleset, and replay root to the canonical digest", () => {
    const claim = { version: 1 as const, player: new Uint8Array(32).fill(1), rulesetHash: new Uint8Array(32).fill(2), replayRoot: new Uint8Array(32).fill(3) };
    const signature = new Uint8Array(64); signature.set(doomRunClaimDigest(claim));
    const work = { ...claim, signature, replayBytes: new Uint8Array([1, 2, 3]) };
    expect(verifyDoomRunClaim(work, (digest, candidate) => digest.every((value, index) => value === candidate[index]))).toBe(true);
    const encoded = encodeDoomVerifyWork(work);
    expect(encoded.slice(0, 5)).toEqual(new Uint8Array([74, 68, 87, 49, 1]));
    expect(decodeDoomVerifyWork(encoded)).toEqual(work);
    encoded[69] ^= 1;
    expect(verifyDoomRunClaim(decodeDoomVerifyWork(encoded), (digest, signature) => digest.every((value, index) => value === signature[index]))).toBe(false);
  });
  it("rejects non-canonical signatures and trailing bytes", () => {
    const base = { version: 1 as const, player: new Uint8Array(32), rulesetHash: new Uint8Array(32), replayRoot: new Uint8Array(32), signature: new Uint8Array(64), replayBytes: new Uint8Array() };
    expect(() => encodeDoomVerifyWork({ ...base, signature: new Uint8Array(63) })).toThrow(/64 bytes/);
    const encoded = encodeDoomVerifyWork(base);
    expect(() => decodeDoomVerifyWork(new Uint8Array([...encoded, 0]))).toThrow(/length mismatch/);
    expect(doomSignatureBytes(`0x${"aa".repeat(64)}`)).toHaveLength(64);
  });
});
