import { describe, expect, it } from "vitest";
import { encodeAddress } from "@polkadot/util-crypto";
import { accountId32 } from "../../src/jam/accountId";

describe("AccountId32 conversion", () => {
  const hex = `0x${"11".repeat(32)}`;

  it("decodes hex AccountId32", () => {
    expect(accountId32(hex)).toEqual(Uint8Array.from({ length: 32 }, () => 0x11));
  });

  it("decodes SS58 to the same AccountId32", () => {
    const ss58 = encodeAddress(accountId32(hex), 42);
    expect(accountId32(ss58)).toEqual(accountId32(hex));
  });

  it("rejects malformed or non-AccountId addresses", () => {
    expect(() => accountId32("not-an-address")).toThrow("Invalid AccountId32 address");
    expect(() => accountId32("0x1234")).toThrow("Invalid AccountId32 address");
  });
});
