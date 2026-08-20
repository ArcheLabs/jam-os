import type { DoomAction, DoomState } from "./types";

export const SCORE_PER_KILL = 1000;
export const SCORE_PER_USE = 25;

export function scoreForTick(actions: DoomAction[], kills: number): number {
  return kills * SCORE_PER_KILL + (actions.includes("use") ? SCORE_PER_USE : 0);
}

export function scoreForState(state: DoomState): number { return state.score; }
