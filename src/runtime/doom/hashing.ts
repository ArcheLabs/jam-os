import { blake2AsHex } from "@polkadot/util-crypto";
import type { DoomState, DoomStateObject } from "./types";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)]));
  return value;
}

export function encodeCanonical(value: unknown): string { return JSON.stringify(canonicalize(value)); }

export function hashState(state: DoomState, objects: DoomStateObject[] = state.objects || []): string {
  const canonical = {
    tick: state.tick,
    health: state.health,
    ammo: state.ammo,
    kills: state.kills,
    score: state.score,
    completed: state.completed,
    objects: [...objects].sort((a, b) => a.id.localeCompare(b.id)),
  };
  return blake2AsHex(new TextEncoder().encode(encodeCanonical(canonical)), 256);
}

export function encodeState(state: DoomState): Uint8Array { return new TextEncoder().encode(encodeCanonical(state)); }

export function decodeState(bytes: Uint8Array): DoomState {
  return JSON.parse(new TextDecoder().decode(bytes)) as DoomState;
}

export function deterministicRandom(seed: string, tick: number, channel: string): number {
  const digest = blake2AsHex(new TextEncoder().encode(`${seed}:${channel}:${tick}`), 256).slice(2, 10);
  return Number.parseInt(digest, 16) / 0xffffffff;
}
