import { MockAccountAdapter, BrowserAccountAdapter } from "./jam/account";
import { ComputerService } from "./jam/computer";
import { RealJamClient } from "./jam/JamClient";
import { MockJamClient } from "./jam/MockJamClient";
import { JamNameService } from "./jam/names";
import { MockPlaygroundAdapter, RealPlaygroundAdapter } from "./jam/playground";
import type { AccountAdapter, JamClient, PlaygroundAdapter } from "./jam/types";

export interface Runtime { mode: "mock" | "live"; client: JamClient; account: AccountAdapter; computer: ComputerService; names: JamNameService; playground: PlaygroundAdapter; }
export function createRuntime(): Runtime { const mode = (import.meta.env.VITE_JAM_MODE || "mock") === "live" ? "live" : "mock"; const client = mode === "mock" ? new MockJamClient() : new RealJamClient(); const account = mode === "mock" ? new MockAccountAdapter(client) : new BrowserAccountAdapter(); return { mode, client, account, computer: new ComputerService(client, account), names: new JamNameService(client, account), playground: mode === "mock" ? new MockPlaygroundAdapter() : new RealPlaygroundAdapter() }; }
