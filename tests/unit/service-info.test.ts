import { describe, expect, it } from "vitest";
import { u8aToHex } from "@polkadot/util";
import { decodeFinalizedServiceInfo } from "../../src/jam/transport";

function compact(value: number): Uint8Array {
  if (value < 64) return new Uint8Array([value << 2]);
  if (value < 16_384) return new Uint8Array([((value << 2) & 0xff) | 1, value >>> 6]);
  throw new Error("test value too large");
}

describe("finalized ServiceInfo decoding", () => {
  it("unwraps StateValue and reads the canonical code hash and byte length", () => {
    const value = new Uint8Array(1 + 32 + 8 * 5 + 4 * 3 + 4);
    value[0] = 1;
    for (let i = 0; i < 32; i++) value[1 + i] = i + 1;
    new DataView(value.buffer).setBigUint64(1 + 32 + 8 * 2, 1234n, true);
    const encoded = new Uint8Array(compact(value.length).length + value.length);
    encoded.set(compact(value.length));
    encoded.set(value, compact(value.length).length);
    const decoded = decodeFinalizedServiceInfo(u8aToHex(encoded));
    expect(decoded.codeHash).toBe(`0x${Array.from({ length: 32 }, (_, i) => (i + 1).toString(16).padStart(2, "0")).join("")}`);
    expect(decoded.codeLength).toBe(1234);
  });

  it("rejects trailing bytes and malformed values", () => {
    expect(() => decodeFinalizedServiceInfo("0x0401aa")).toThrow(/StateValue/);
  });
});
