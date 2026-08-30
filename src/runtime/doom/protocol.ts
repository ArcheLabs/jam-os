import type { DoomAction, DoomInput } from "./types";

export const DOOM_SERVICE_PROTOCOL_VERSION = 1;
export const DOOM_SERVICE_VERSION = 1;

export type DoomServiceRequest =
  | { version: 1; op: "create_session"; sessionId: string; map: string; difficulty: string; rulesetVersion: number; runtimeVersion: string }
  | { version: 1; op: "input"; sessionId: string; inputs: DoomInput[] }
  | { version: 1; op: "execute"; sessionId: string; ticks: number }
  | { version: 1; op: "finish"; sessionId: string };

export function createSessionRequest(sessionId: string, map: string, difficulty: string, rulesetVersion: number, runtimeVersion: string): DoomServiceRequest { return { version: 1, op: "create_session", sessionId, map, difficulty, rulesetVersion, runtimeVersion }; }
export function inputRequest(sessionId: string, inputs: DoomInput[]): DoomServiceRequest { return { version: 1, op: "input", sessionId, inputs: inputs.map((input) => ({ tick: input.tick, actions: [...input.actions] as DoomAction[] })) }; }
export function executeRequest(sessionId: string, ticks: number): DoomServiceRequest { return { version: 1, op: "execute", sessionId, ticks }; }
export function finishRequest(sessionId: string): DoomServiceRequest { return { version: 1, op: "finish", sessionId }; }
