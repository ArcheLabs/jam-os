export class JamNetworkError extends Error { name = "JamNetworkError"; }
export class JamPermissionError extends Error { name = "JamPermissionError"; }
export class JamNotFoundError extends Error { name = "JamNotFoundError"; }
export class JamInvalidPathError extends Error { name = "JamInvalidPathError"; }
export class JamServiceError extends Error { name = "JamServiceError"; constructor(message: string, public readonly code = "SERVICE_ERROR") { super(message); } }
export class JamAuthorizationError extends JamServiceError { name = "JamAuthorizationError"; constructor(message = "Account authorization is unavailable") { super(message, "ACCOUNT_SIGNING_UNAVAILABLE"); } }
export class JamProtocolError extends JamServiceError { name = "JamProtocolError"; constructor(message: string, code = "COMPUTER_SERVICE_ABI_MISMATCH") { super(message, code); } }
export class JnsNotConfiguredError extends JamServiceError { name = "JnsNotConfiguredError"; constructor() { super("JNS service is not configured", "JNS_NOT_CONFIGURED"); } }
export class JnsNameTakenError extends Error { name = "JnsNameTakenError"; }
export class JnsInvalidNameError extends Error { name = "JnsInvalidNameError"; }
export class PlaygroundCompileError extends Error { name = "PlaygroundCompileError"; }
