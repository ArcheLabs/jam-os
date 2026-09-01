import { blake2AsU8a } from "@polkadot/util-crypto";
import { accountId32 } from "../../jam/accountId";
import type { AccountAdapter, AccountInfo } from "../../jam/types";

export type RunPermitV1 = {
  version: 1;
  runnerDomain: Uint8Array;
  rulesetHash: Uint8Array;
  runId: Uint8Array;
  player: Uint8Array;
  expiresAt: bigint;
};

const DOMAIN = new TextEncoder().encode("JAM_DOOM_RUN_V1");
function hex(value: string, name: string): Uint8Array {
  const raw = value.replace(/^0x/i, "");
  if (!/^[0-9a-f]{64}$/i.test(raw)) throw new Error(`${name} must be 32-byte hex`);
  return new Uint8Array(raw.match(/../g)!.map((part) => parseInt(part, 16)));
}
function u64(value: bigint): Uint8Array { const out = new Uint8Array(8); new DataView(out.buffer).setBigUint64(0, value, true); return out; }
function encode(permit: RunPermitV1): Uint8Array {
  const out = new Uint8Array(1 + 32 * 4 + 8); out[0] = permit.version;
  out.set(permit.runnerDomain, 1); out.set(permit.rulesetHash, 33); out.set(permit.runId, 65); out.set(permit.player, 97); out.set(u64(permit.expiresAt), 129); return out;
}
export function runPermitDigest(permit: RunPermitV1): Uint8Array { return blake2AsU8a(new Uint8Array([...DOMAIN, ...encode(permit)]), 256); }
export function randomRunId(): Uint8Array { const runId = new Uint8Array(32); crypto.getRandomValues(runId); return runId; }
export async function createRunPermit(account: AccountAdapter, info: AccountInfo, runnerDomain: string, rulesetHash: string, expiresInSeconds = 300) {
  if (!account.sign) throw new Error("DOOM_RUN_WALLET_CANNOT_SIGN");
  const permit: RunPermitV1 = { version: 1, runnerDomain: hex(runnerDomain, "runnerDomain"), rulesetHash: hex(rulesetHash, "rulesetHash"), runId: randomRunId(), player: accountId32(info.address), expiresAt: BigInt(Math.floor(Date.now() / 1000) + expiresInSeconds) };
  const signature = await account.sign(`0x${Array.from(runPermitDigest(permit), (byte) => byte.toString(16).padStart(2, "0")).join("")}`, { action: "work" });
  return { permit, signature };
}
export function permitJson(value: { permit: RunPermitV1; signature: string }) { return { version: 1, runnerDomain: `0x${toHex(value.permit.runnerDomain)}`, rulesetHash: `0x${toHex(value.permit.rulesetHash)}`, runId: `0x${toHex(value.permit.runId)}`, player: `0x${toHex(value.permit.player)}`, expiresAt: value.permit.expiresAt.toString(), playerSignature: value.signature }; }
function toHex(bytes: Uint8Array): string { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
