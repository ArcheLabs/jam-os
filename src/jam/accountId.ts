import { hexToU8a } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { JamAuthorizationError } from "./errors";

/** Convert a wallet's display address into the canonical 32-byte AccountId. */
export function accountId32(address: string): Uint8Array {
  try {
    const decoded = /^0x[0-9a-fA-F]{64}$/.test(address)
      ? hexToU8a(address)
      : decodeAddress(address);
    if (decoded.length !== 32) throw new Error("decoded identity is not 32 bytes");
    return decoded.slice();
  } catch (error) {
    throw new JamAuthorizationError(error instanceof Error ? `Invalid AccountId32 address: ${error.message}` : "Invalid AccountId32 address");
  }
}

/** Deterministic identity for preview-only synthetic accounts. Never use in live mode. */
export function mockAccountId32(address: string): Uint8Array {
  try {
    return accountId32(address);
  } catch {
    const encoded = new TextEncoder().encode(address);
    const output = new Uint8Array(32);
    output.set(encoded.slice(0, 32));
    return output;
  }
}
