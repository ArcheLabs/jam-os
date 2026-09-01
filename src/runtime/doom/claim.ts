import { blake2AsU8a } from "@polkadot/util-crypto";
import { accountId32 } from "../../jam/accountId";
import type { AccountAdapter, AccountInfo } from "../../jam/types";

export const DOOM_RUN_CLAIM_VERSION = 1;
export const DOOM_RUN_CLAIM_DOMAIN = new TextEncoder().encode("JAM_DOOM_RUN_CLAIM_V1");
export const DOOM_VERIFY_WORK_MAGIC = "JDW1";
export const DOOM_VERIFY_WORK_VERSION = 1;
export const DOOM_SIGNATURE_BYTES = 64;

export interface DoomRunClaimV1 { version: 1; player: Uint8Array; rulesetHash: Uint8Array; replayRoot: Uint8Array; }
export interface DoomVerifyWorkV1 extends DoomRunClaimV1 { signature: Uint8Array; replayBytes: Uint8Array; }

function bytes32(value: Uint8Array | string, name: string): Uint8Array {
  const bytes = typeof value === "string" ? hexBytes(value, name) : value;
  if (bytes.length !== 32) throw new Error(`${name} must be exactly 32 bytes`);
  return bytes.slice();
}
function hexBytes(value: string, name: string): Uint8Array {
  const normalized = value.replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(normalized) || normalized.length % 2 !== 0) throw new Error(`${name} must be hex`);
  return new Uint8Array(normalized.match(/../g)!.map((part) => Number.parseInt(part, 16)));
}
export function doomSignatureBytes(value: string): Uint8Array {
  const bytes = hexBytes(value, "signature");
  if (bytes.length !== DOOM_SIGNATURE_BYTES) throw new Error("signature must be exactly 64 bytes");
  return bytes;
}
function concat(...parts: Uint8Array[]): Uint8Array { const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0)); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output; }

export function doomRunClaimDigest(claim: DoomRunClaimV1): Uint8Array {
  if (claim.version !== 1) throw new Error("unsupported DoomRunClaimV1 version");
  return blake2AsU8a(concat(DOOM_RUN_CLAIM_DOMAIN, Uint8Array.of(1), bytes32(claim.player, "player"), bytes32(claim.rulesetHash, "rulesetHash"), bytes32(claim.replayRoot, "replayRoot")), 256);
}

export async function createDoomRunClaim(account: AccountAdapter, info: AccountInfo, rulesetHash: Uint8Array | string, replayRoot: Uint8Array | string) {
  if (!account.sign) throw new Error("DOOM_RUN_WALLET_CANNOT_SIGN");
  const claim: DoomRunClaimV1 = { version: 1, player: accountId32(info.address), rulesetHash: bytes32(rulesetHash, "rulesetHash"), replayRoot: bytes32(replayRoot, "replayRoot") };
  const signature = await account.sign(`0x${Array.from(doomRunClaimDigest(claim), (byte) => byte.toString(16).padStart(2, "0")).join("")}`, { action: "work" });
  return { claim, signature };
}

export function encodeDoomVerifyWork(work: DoomVerifyWorkV1): Uint8Array {
  if (work.version !== 1) throw new Error("unsupported DoomVerifyWorkV1 version");
  if (work.signature.length !== DOOM_SIGNATURE_BYTES) throw new Error("signature must be exactly 64 bytes");
  if (work.replayBytes.length > 0xffffffff) throw new Error("replay is too large");
  const output = new Uint8Array(4 + 1 + 32 + 32 + 32 + DOOM_SIGNATURE_BYTES + 4 + work.replayBytes.length);
  output.set(new TextEncoder().encode(DOOM_VERIFY_WORK_MAGIC)); output[4] = 1;
  output.set(bytes32(work.player, "player"), 5); output.set(bytes32(work.rulesetHash, "rulesetHash"), 37); output.set(bytes32(work.replayRoot, "replayRoot"), 69); output.set(work.signature, 101);
  new DataView(output.buffer).setUint32(165, work.replayBytes.length, true); output.set(work.replayBytes, 169);
  return output;
}

export function decodeDoomVerifyWork(bytes: Uint8Array): DoomVerifyWorkV1 {
  if (bytes.length < 169) throw new Error("verify work header is truncated");
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== DOOM_VERIFY_WORK_MAGIC || bytes[4] !== DOOM_VERIFY_WORK_VERSION) throw new Error("invalid DoomVerifyWorkV1 header");
  const replaySize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(165, true);
  if (bytes.length !== 169 + replaySize) throw new Error("verify work replay length mismatch");
  return { version: 1, player: bytes.slice(5, 37), rulesetHash: bytes.slice(37, 69), replayRoot: bytes.slice(69, 101), signature: bytes.slice(101, 165), replayBytes: bytes.slice(169) };
}

export function verifyDoomRunClaim(work: DoomVerifyWorkV1, verifySignature: (digest: Uint8Array, signature: Uint8Array, player: Uint8Array) => boolean): boolean {
  if (work.version !== 1 || work.signature.length !== DOOM_SIGNATURE_BYTES) return false;
  return verifySignature(doomRunClaimDigest(work), work.signature, work.player);
}
