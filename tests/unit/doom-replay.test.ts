import { describe, expect, it } from "vitest";
import { decodeDoomReplay, doomRunId, encodeDoomReplay } from "../../src/runtime/doom/replay";

const ruleset = new Uint8Array(32).fill(7);
const commands = [{ forwardMove: 50, sideMove: -2, angleTurn: -1234, buttons: 3 }, { forwardMove: 0, sideMove: 4, angleTurn: 12, buttons: 0 }];

describe("DoomReplayV1", () => {
  it("uses the deterministic 41-byte header and 5-byte ticcmd wire format", () => {
    let encoded = encodeDoomReplay({ version: 1, rulesetHash: ruleset, ticcmds: commands });
    expect(encoded.length).toBe(41 + commands.length * 5);
    expect(Array.from(encoded.slice(0, 5))).toEqual([74, 68, 82, 49, 1]);
    expect(decodeDoomReplay(encoded, ruleset)).toEqual({ version: 1, rulesetHash: ruleset, ticcmds: commands });
    expect(doomRunId(encoded)).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it.each(["magic", "version", "ruleset", "trailing"]) ("rejects invalid %s data", (kind) => {
    let encoded = encodeDoomReplay({ version: 1, rulesetHash: ruleset, ticcmds: commands });
    if (kind === "magic") encoded[0] ^= 1;
    if (kind === "version") encoded[4] = 2;
    if (kind === "ruleset") encoded[5] ^= 1;
    if (kind === "trailing") encoded = new Uint8Array([...encoded, 0]);
    expect(() => decodeDoomReplay(encoded, ruleset)).toThrow();
  });
  it("rejects zero, oversized, and mismatched lengths", () => {
    const zero = encodeDoomReplay({ version: 1, rulesetHash: ruleset, ticcmds: commands });
    new DataView(zero.buffer).setUint32(37, 0, true);
    expect(() => decodeDoomReplay(zero)).toThrow(/at least one/);
    expect(() => encodeDoomReplay({ version: 1, rulesetHash: ruleset, ticcmds: Array.from({ length: 21_001 }, () => commands[0]) })).toThrow(/MAX_TICS/);
  });
});
