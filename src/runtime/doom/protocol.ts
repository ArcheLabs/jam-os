import type { DoomAction, DoomInput } from "./types";

export const DOOM_SERVICE_PROTOCOL_VERSION = 1;

export type DoomServiceRequest =
  | { v: 1; op: "create_session"; map: string; difficulty: string; rulesetVersion: number; runtimeVersion: string }
  | { v: 1; op: "execute"; session: string; inputs: DoomInput[] }
  | { v: 1; op: "state"; session: string }
  | { v: 1; op: "finish"; session: string };

export function createSessionRequest(map: string, difficulty: string, rulesetVersion: number, runtimeVersion: string): DoomServiceRequest { return { v: 1, op: "create_session", map, difficulty, rulesetVersion, runtimeVersion }; }
export function executeRequest(session: string, inputs: DoomInput[]): DoomServiceRequest { return { v: 1, op: "execute", session, inputs: inputs.map((input) => ({ tick: input.tick, actions: [...input.actions] as DoomAction[] })) }; }
export function stateRequest(session: string): DoomServiceRequest { return { v: 1, op: "state", session }; }
export function finishRequest(session: string): DoomServiceRequest { return { v: 1, op: "finish", session }; }
