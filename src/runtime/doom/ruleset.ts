import { blake2AsHex } from "@polkadot/util-crypto";

export const DOOM_RULESET_V2_DOMAIN = "JAM_DOOM_RULESET_V2";
export const DOOM_RULESET_V2_ENGINE_COMMIT = "cc68c85c172fd3d30a5561250f027640ac4e099e";
export const DOOM_RULESET_V2_WAD_HASH = "b1efef593aae01511b5e5359263a4d6fc0f7b5bb8248e17ec090fef11d9fbe68";
export const DOOM_RULESET_V2_MAX_TICS = 21_000;

export interface DoomRulesetV2 {
  version: 2;
  engine: "Polkadoom";
  engineCommit: string;
  wadHash: string;
  episode: 1;
  map: 1;
  skill: 3;
  replayVersion: 1;
  ticcmdVersion: 1;
  ticRate: 35;
  completionState: "GS_INTERMISSION";
  completionMetric: "leveltime";
  deathState: "PST_DEAD";
  maxTics: 21_000;
}

export const DOOM_RULESET_V2: DoomRulesetV2 = {
  version: 2,
  engine: "Polkadoom",
  engineCommit: DOOM_RULESET_V2_ENGINE_COMMIT,
  wadHash: DOOM_RULESET_V2_WAD_HASH,
  episode: 1,
  map: 1,
  skill: 3,
  replayVersion: 1,
  ticcmdVersion: 1,
  ticRate: 35,
  completionState: "GS_INTERMISSION",
  completionMetric: "leveltime",
  deathState: "PST_DEAD",
  maxTics: DOOM_RULESET_V2_MAX_TICS,
};

function hexBytes(value: string): Uint8Array {
  const normalized = value.replace(/^0x/i, "");
  if (!/^[0-9a-f]{64}$/i.test(normalized)) throw new Error("ruleset hash fields must be 32-byte hex");
  return new Uint8Array(normalized.match(/../g)!.map((part) => Number.parseInt(part, 16)));
}

function engineCommitBytes(value: string): Uint8Array {
  const normalized = value.replace(/^0x/i, "");
  if (!/^[0-9a-f]{40}$/i.test(normalized)) throw new Error("engineCommit must be a 20-byte git SHA");
  const output = new Uint8Array(32);
  output.set(new Uint8Array(normalized.match(/../g)!.map((part) => Number.parseInt(part, 16))), 12);
  return output;
}

/** Canonical binary bytes, excluding the domain prefix used for hashing. */
export function encodeDoomRulesetV2(ruleset: DoomRulesetV2 = DOOM_RULESET_V2): Uint8Array {
  if (ruleset.version !== 2 || ruleset.engine !== "Polkadoom") throw new Error("unsupported DoomRulesetV2");
  const output = new Uint8Array(79);
  let offset = 0;
  output[offset++] = ruleset.version;
  output.set(engineCommitBytes(ruleset.engineCommit), offset); offset += 32;
  output.set(hexBytes(ruleset.wadHash), offset); offset += 32;
  output[offset++] = ruleset.episode;
  output[offset++] = ruleset.map;
  output[offset++] = ruleset.skill;
  output[offset++] = ruleset.replayVersion;
  output[offset++] = ruleset.ticcmdVersion;
  new DataView(output.buffer).setUint16(offset, ruleset.ticRate, true); offset += 2;
  output[offset++] = 1; // GS_INTERMISSION
  output[offset++] = 1; // leveltime
  output[offset++] = 1; // PST_DEAD
  new DataView(output.buffer).setUint32(offset, ruleset.maxTics, true);
  return output;
}

export function doomRulesetV2Hash(ruleset: DoomRulesetV2 = DOOM_RULESET_V2): string {
  const domain = new TextEncoder().encode(DOOM_RULESET_V2_DOMAIN);
  const bytes = encodeDoomRulesetV2(ruleset);
  const input = new Uint8Array(domain.length + bytes.length);
  input.set(domain); input.set(bytes, domain.length);
  return blake2AsHex(input, 256).toLowerCase();
}

export const DOOM_RULESET_V2_HASH = doomRulesetV2Hash();
