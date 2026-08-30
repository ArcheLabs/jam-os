export class JamNetworkError extends Error { name = "JamNetworkError"; }
export class JamPermissionError extends Error { name = "JamPermissionError"; }
export class JamNotFoundError extends Error { name = "JamNotFoundError"; }
export class JamInvalidPathError extends Error { name = "JamInvalidPathError"; }
export class JamServiceError extends Error { name = "JamServiceError"; constructor(message: string, public readonly code = "SERVICE_ERROR", public readonly details?: unknown) { super(message); } }
export class JamAuthorizationError extends JamServiceError { name = "JamAuthorizationError"; constructor(message = "Account authorization is unavailable") { super(message, "ACCOUNT_SIGNING_UNAVAILABLE"); } }
export class JamProtocolError extends JamServiceError { name = "JamProtocolError"; constructor(message: string, code = "COMPUTER_SERVICE_ABI_MISMATCH") { super(message, code); } }
export class JnsNotConfiguredError extends JamServiceError { name = "JnsNotConfiguredError"; constructor() { super("JNS service is not configured", "JNS_NOT_CONFIGURED"); } }
export class JnsNameTakenError extends JamServiceError { name = "JnsNameTakenError"; constructor() { super("Name is already claimed", "NAME_TAKEN"); } }
export class JnsNameNotFoundError extends JamServiceError { name = "JnsNameNotFoundError"; constructor() { super("Name was not found", "NAME_NOT_FOUND"); } }
export class JnsNotOwnerError extends JamServiceError { name = "JnsNotOwnerError"; constructor() { super("Only the name owner can bind it", "NOT_OWNER"); } }
export class JnsInvalidNameError extends JamServiceError { name = "JnsInvalidNameError"; constructor(message = "Invalid JNS name") { super(message, "INVALID_NAME"); } }
export class PlaygroundCompileError extends Error { name = "PlaygroundCompileError"; }
