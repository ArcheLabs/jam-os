import type { AccountInfo } from "../jam/types";
import type { JamFileSystem } from "../jam/filesystem";
import type { JamNameService } from "../jam/names";
import type { Runtime } from "../runtime";
export interface ShellContext { cwd: string; account: AccountInfo | null; computerServiceId: string | null; fs: JamFileSystem | null; names: JamNameService; runtime: Runtime; openApp: (id: string, args?: string) => void; }
export interface CommandResult { exitCode: number; stdout?: string; stderr?: string; }
