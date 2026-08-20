export class CapabilityUnavailableError extends Error {
  readonly code = "CAPABILITY_UNAVAILABLE";
  constructor(capability: string) { super(`${capability} is not available in this runtime`); this.name = "CapabilityUnavailableError"; }
}
