import type { DoomAction, DoomInput } from "./types";

export const DOOM_SERVICE_PROTOCOL_VERSION = 1;
export const DOOM_SERVICE_VERSION = 1;

export type DoomServiceRequest =
  | { version: 1; op: "create_session"; sessionId: string; account: string; map: string; difficulty: string; rulesetVersion: number; runtimeVersion: string }
  | { version: 1; op: "input"; sessionId: string; account: string; inputs: DoomInput[] }
  | { version: 1; op: "execute"; sessionId: string; account: string; ticks: number }
  | { version: 1; op: "finish"; sessionId: string; account: string };

export function createSessionRequest(sessionId: string, account: string, map: string, difficulty: string, rulesetVersion: number, runtimeVersion: string): DoomServiceRequest { return { version: 1, op: "create_session", sessionId, account, map, difficulty, rulesetVersion, runtimeVersion }; }
export function inputRequest(sessionId: string, account: string, inputs: DoomInput[]): DoomServiceRequest { return { version: 1, op: "input", sessionId, account, inputs: inputs.map((input) => ({ tick: input.tick, actions: [...input.actions] as DoomAction[] })) }; }
export function executeRequest(sessionId: string, account: string, ticks: number): DoomServiceRequest { return { version: 1, op: "execute", sessionId, account, ticks }; }
export function finishRequest(sessionId: string, account: string): DoomServiceRequest { return { version: 1, op: "finish", sessionId, account }; }
