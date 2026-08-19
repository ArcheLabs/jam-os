import { MiniJamRuntime } from "./minijam/MiniJamRuntime";
import { MockJamOsRuntime } from "./mock/MockJamOsRuntime";
import type { JamOsRuntimeV2, RuntimeCompatibility } from "./types";

export type Runtime = JamOsRuntimeV2 & RuntimeCompatibility;
export function createRuntime(forceMock = false): Runtime { const live = !forceMock && import.meta.env.VITE_JAM_MODE === "live"; return (live ? new MiniJamRuntime() : new MockJamOsRuntime()) as Runtime; }
export type * from "./types";
