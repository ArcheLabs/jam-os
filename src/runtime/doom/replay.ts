import { blake2AsHex, blake2AsU8a } from "@polkadot/util-crypto";

export const DOOM_REPLAY_MAGIC = "JDR1";
export const DOOM_REPLAY_VERSION = 1;
export const DOOM_REPLAY_HEADER_BYTES = 41;
export const DOOM_TICCMD_BYTES = 5;
export const DOOM_REPLAY_MAX_TICS = 21_000;

export interface DoomTicCmdV1 {
  forwardMove: number;
  sideMove: number;
  angleTurn: number;
  buttons: number;
}

export interface DoomReplayV1 {
  version: 1;
  rulesetHash: Uint8Array;
  ticcmds: DoomTicCmdV1[];
}

function bytes32(value: Uint8Array | string, name: string): Uint8Array {
  const bytes = typeof value === "string" ? hexBytes(value, name) : value;
  if (bytes.length !== 32) throw new Error(`${name} must be exactly 32 bytes`);
  return bytes.slice();
}

function hexBytes(value: string, name: string): Uint8Array {
  const normalized = value.replace(/^0x/i, "");
  if (!/^[0-9a-f]{64}$/i.test(normalized)) throw new Error(`${name} must be 32-byte hex`);
  return new Uint8Array(normalized.match(/../g)!.map((part) => Number.parseInt(part, 16)));
}

function signed8(value: number, name: string): number {
  if (!Number.isInteger(value) || value < -128 || value > 127) throw new Error(`${name} must be an i8`);
  return value;
}

function signed16(value: number, name: string): number {
  if (!Number.isInteger(value) || value < -32768 || value > 32767) throw new Error(`${name} must be an i16`);
  return value;
}

function commandBytes(command: DoomTicCmdV1): Uint8Array {
  signed8(command.forwardMove, "forwardMove");
  signed8(command.sideMove, "sideMove");
  signed16(command.angleTurn, "angleTurn");
  if (!Number.isInteger(command.buttons) || command.buttons < 0 || command.buttons > 255) throw new Error("buttons must be a u8");
  const bytes = new Uint8Array(DOOM_TICCMD_BYTES);
  const view = new DataView(bytes.buffer);
  view.setInt8(0, command.forwardMove);
  view.setInt8(1, command.sideMove);
  view.setInt16(2, command.angleTurn, true);
  bytes[4] = command.buttons;
  return bytes;
}

export function encodeDoomReplay(replay: DoomReplayV1): Uint8Array {
  if (replay.version !== 1) throw new Error("unsupported DoomReplayV1 version");
  const rulesetHash = bytes32(replay.rulesetHash, "rulesetHash");
  if (!Array.isArray(replay.ticcmds) || replay.ticcmds.length === 0) throw new Error("replay must contain at least one tic");
  if (replay.ticcmds.length > DOOM_REPLAY_MAX_TICS) throw new Error(`replay exceeds MAX_TICS=${DOOM_REPLAY_MAX_TICS}`);
  const output = new Uint8Array(DOOM_REPLAY_HEADER_BYTES + replay.ticcmds.length * DOOM_TICCMD_BYTES);
  output.set(new TextEncoder().encode(DOOM_REPLAY_MAGIC), 0);
  output[4] = DOOM_REPLAY_VERSION;
  output.set(rulesetHash, 5);
  new DataView(output.buffer).setUint32(37, replay.ticcmds.length, true);
  replay.ticcmds.forEach((command, index) => output.set(commandBytes(command), DOOM_REPLAY_HEADER_BYTES + index * DOOM_TICCMD_BYTES));
  return output;
}

export function decodeDoomReplay(bytes: Uint8Array, expectedRulesetHash?: Uint8Array | string): DoomReplayV1 {
  if (bytes.length < DOOM_REPLAY_HEADER_BYTES) throw new Error("replay header is truncated");
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== DOOM_REPLAY_MAGIC) throw new Error("invalid replay magic");
  if (bytes[4] !== DOOM_REPLAY_VERSION) throw new Error("unsupported replay version");
  const rulesetHash = bytes.slice(5, 37);
  if (expectedRulesetHash && !rulesetHash.every((value, index) => value === bytes32(expectedRulesetHash, "expectedRulesetHash")[index])) throw new Error("replay ruleset does not match expected ruleset");
  const ticCount = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(37, true);
  if (ticCount === 0) throw new Error("replay must contain at least one tic");
  if (ticCount > DOOM_REPLAY_MAX_TICS) throw new Error(`replay exceeds MAX_TICS=${DOOM_REPLAY_MAX_TICS}`);
  const expectedLength = DOOM_REPLAY_HEADER_BYTES + ticCount * DOOM_TICCMD_BYTES;
  if (bytes.length !== expectedLength) throw new Error("replay length does not match ticCount");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ticcmds = Array.from({ length: ticCount }, (_, index) => {
    const offset = DOOM_REPLAY_HEADER_BYTES + index * DOOM_TICCMD_BYTES;
    return { forwardMove: view.getInt8(offset), sideMove: view.getInt8(offset + 1), angleTurn: view.getInt16(offset + 2, true), buttons: bytes[offset + 4] };
  });
  return { version: 1, rulesetHash, ticcmds };
}

export function doomReplayRoot(bytes: Uint8Array): string { return blake2AsHex(bytes, 256).toLowerCase(); }
export function doomReplayRootBytes(bytes: Uint8Array): Uint8Array { return blake2AsU8a(bytes, 256); }
