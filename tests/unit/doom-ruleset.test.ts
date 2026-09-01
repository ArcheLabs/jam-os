import { describe, expect, it } from "vitest";
import { DOOM_RULESET_V2_HASH, encodeDoomRulesetV2, doomRulesetV2Hash } from "../../src/runtime/doom/ruleset";

describe("DoomRulesetV2", () => {
  it("uses the canonical binary vector", () => {
    expect(encodeDoomRulesetV2()).toHaveLength(79);
    expect(doomRulesetV2Hash()).toBe("0x49d65a8cb7ebbd05b9b1d0ef11095a6d924863f45e3afc1488e89b108652d97f");
    expect(DOOM_RULESET_V2_HASH).toBe("0x49d65a8cb7ebbd05b9b1d0ef11095a6d924863f45e3afc1488e89b108652d97f");
  });
});
