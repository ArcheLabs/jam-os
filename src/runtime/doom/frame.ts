import { encodeCanonical } from "./hashing";
import { DoomRuntimeError } from "./errors";
import type { DoomFrame, DoomInput } from "./types";

const FRAME_MAGIC = new Uint8Array([0x4a, 0x44, 0x46, 0x31]);
const HEADER_BYTES = 4 + 4 + 2 + 2 + 2 + 2;

function textBytes(value: string): Uint8Array { return new TextEncoder().encode(value); }

function readText(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder().decode(bytes.slice(offset, offset + length));
}

/** Canonical input bytes are stable across browsers and runtimes. */
export function serializeDoomInput(input: DoomInput): Uint8Array {
  return textBytes(encodeCanonical({ tick: input.tick, actions: [...input.actions] }));
}

export function deserializeDoomInput(bytes: Uint8Array): DoomInput {
  try {
    const input = JSON.parse(new TextDecoder().decode(bytes)) as DoomInput;
    if (!Number.isSafeInteger(input.tick) || input.tick < 0 || !Array.isArray(input.actions)) throw new Error("invalid input");
    return { tick: input.tick, actions: [...input.actions] };
  } catch {
    throw new DoomRuntimeError("INVALID_INPUT", "Malformed DOOM input bytes");
  }
}

/** Compact binary frame envelope used by the WebSocket path. */
export function encodeDoomFrame(frame: DoomFrame): Uint8Array {
  const session = textBytes(frame.sessionId);
  const stateHash = textBytes(frame.stateHash || "");
  if (session.length > 0xffff || stateHash.length > 0xffff || frame.width <= 0 || frame.height <= 0 || frame.width > 0xffff || frame.height > 0xffff) throw new DoomRuntimeError("INVALID_RECEIPT", "Invalid DOOM frame dimensions or metadata");
  if (frame.pixels.length !== frame.width * frame.height * 4) throw new DoomRuntimeError("INVALID_RECEIPT", "DOOM frame must contain RGBA pixels");
  const bytes = new Uint8Array(HEADER_BYTES + session.length + stateHash.length + frame.pixels.length);
  bytes.set(FRAME_MAGIC, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, frame.tick);
  view.setUint16(8, frame.width);
  view.setUint16(10, frame.height);
  view.setUint16(12, session.length);
  view.setUint16(14, stateHash.length);
  let offset = HEADER_BYTES;
  bytes.set(session, offset); offset += session.length;
  bytes.set(stateHash, offset); offset += stateHash.length;
  bytes.set(frame.pixels, offset);
  return bytes;
}

export function decodeDoomFrame(bytes: Uint8Array): DoomFrame {
  if (bytes.length < HEADER_BYTES || !FRAME_MAGIC.every((value, index) => bytes[index] === value)) throw new DoomRuntimeError("INVALID_RECEIPT", "Malformed DOOM frame envelope");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tick = view.getUint32(4);
  const width = view.getUint16(8);
  const height = view.getUint16(10);
  const sessionLength = view.getUint16(12);
  const hashLength = view.getUint16(14);
  const pixelOffset = HEADER_BYTES + sessionLength + hashLength;
  if (pixelOffset > bytes.length || bytes.length - pixelOffset !== width * height * 4) throw new DoomRuntimeError("INVALID_RECEIPT", "DOOM frame pixel payload is invalid");
  const sessionId = readText(bytes, HEADER_BYTES, sessionLength);
  const stateHash = readText(bytes, HEADER_BYTES + sessionLength, hashLength);
  return { sessionId, tick, width, height, pixels: bytes.slice(pixelOffset), stateHash: stateHash || undefined };
}

function rgba(pixels: Uint8Array, width: number, x: number, y: number, color: readonly [number, number, number, number]) {
  if (x < 0 || y < 0 || x >= width) return;
  const offset = (y * width + x) * 4;
  pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2]; pixels[offset + 3] = color[3];
}

function rect(pixels: Uint8Array, width: number, height: number, left: number, top: number, right: number, bottom: number, color: readonly [number, number, number, number]) {
  for (let y = Math.max(0, top); y < Math.min(height, bottom); y += 1) for (let x = Math.max(0, left); x < Math.min(width, right); x += 1) rgba(pixels, width, x, y, color);
}

/** Deterministic software renderer for the current runtime state. */
export function renderDoomFrame(sessionId: string, state: { tick: number; stateHash: string; health: number; ammo: number; score: number; objects?: Array<{ kind: string; x: number; y: number; alive: boolean }> }, width = 320, height = 200): DoomFrame {
  const pixels = new Uint8Array(width * height * 4);
  pixels.fill(255);
  rect(pixels, width, height, 0, 0, width, height / 2, [20, 27, 43, 255]);
  rect(pixels, width, height, 0, height / 2, width, height, [38, 27, 24, 255]);
  for (let x = 0; x < width; x += 1) {
    const horizon = Math.floor(height / 2);
    rgba(pixels, width, x, horizon, [206, 132, 77, 255]);
    if (x % 32 === 0) for (let y = horizon + 1; y < height; y += 8) rgba(pixels, width, x, y, [82, 51, 41, 255]);
  }
  for (let y = height / 2 + 18; y < height; y += 18) for (let x = 0; x < width; x += 16) rgba(pixels, width, x, y, [72, 44, 36, 255]);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  rect(pixels, width, height, centerX - 1, centerY - 7, centerX + 2, centerY + 8, [240, 226, 197, 255]);
  rect(pixels, width, height, centerX - 7, centerY - 1, centerX + 8, centerY + 2, [240, 226, 197, 255]);
  for (const object of state.objects || []) {
    if (object.kind === "player") continue;
    const x = centerX + Math.max(-100, Math.min(100, Math.round(object.x * 4)));
    const y = centerY - Math.max(8, Math.min(75, Math.round(object.y * 2)));
    const color = object.alive ? [184, 53, 42, 255] as const : [78, 65, 62, 255] as const;
    rect(pixels, width, height, x - 7, y - 10, x + 8, y + 10, color);
    rect(pixels, width, height, x - 11, y + 10, x + 12, y + 13, color);
  }
  rect(pixels, width, height, 0, height - 22, width, height, [12, 14, 18, 255]);
  rect(pixels, width, height, 14, height - 13, 70, height - 8, [53, 185, 95, 255]);
  rect(pixels, width, height, 14, height - 13, 14 + Math.round(Math.max(0, Math.min(100, state.health)) * .56), height - 8, [212, 66, 52, 255]);
  rect(pixels, width, height, width - 70, height - 13, width - 14, height - 8, [45, 114, 189, 255]);
  rect(pixels, width, height, width - 70, height - 13, width - 70 + Math.round(Math.max(0, Math.min(100, state.ammo * 2)) * .56), height - 8, [232, 169, 62, 255]);
  return { sessionId, tick: state.tick, width, height, pixels, stateHash: state.stateHash };
}
