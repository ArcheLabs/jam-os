import type { AccountInfo } from "../jam/types";
import type { FileSystemRuntime, JamOsRuntimeV2, NameRuntime } from "../runtime/types";
export interface ShellContext { cwd: string; account: AccountInfo | null; computerServiceId: string | null; fs: FileSystemRuntime | null; names: NameRuntime; runtime: JamOsRuntimeV2; openApp: (id: string, args?: string) => void; }
export interface CommandResult { exitCode: number; stdout?: string; stderr?: string; }
