import { MiniJamRuntime } from "./minijam/MiniJamRuntime";
import { MockJamOsRuntime } from "./mock/MockJamOsRuntime";
import type { JamOsRuntimeV2 } from "./types";

export type Runtime = JamOsRuntimeV2;
export function createRuntime(forceMock = false): JamOsRuntimeV2 { const live = !forceMock && import.meta.env.VITE_JAM_MODE === "live"; return live ? new MiniJamRuntime() : new MockJamOsRuntime(); }
export type * from "./types";
