export type DoomErrorCode = "DOOM_RUNTIME_UNAVAILABLE" | "SESSION_NOT_FOUND" | "SESSION_FINISHED" | "INVALID_INPUT" | "INVALID_TICK";

export class DoomRuntimeError extends Error {
  name = "DoomRuntimeError";
  constructor(public readonly code: DoomErrorCode, message: string) { super(message); }
}
