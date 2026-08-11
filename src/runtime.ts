import { MockAccountAdapter, BrowserAccountAdapter } from "./jam/account";
import { ComputerService } from "./jam/computer";
import { RealJamClient } from "./jam/JamClient";
import { MockJamClient } from "./jam/MockJamClient";
import { JamNameService } from "./jam/names";
import { MockPlaygroundAdapter, RealPlaygroundAdapter } from "./jam/playground";
import { MiniJamTransport } from "./jam/transport";
import type { AccountAdapter, JamClient, PlaygroundAdapter } from "./jam/types";

export interface Runtime { mode: "mock" | "live"; client: JamClient; account: AccountAdapter; computer: ComputerService; names: JamNameService; playground: PlaygroundAdapter; }
export function createRuntime(): Runtime { const mode = (import.meta.env.VITE_JAM_MODE || "mock") === "live" ? "live" : "mock"; if (mode === "mock") { const client = new MockJamClient(); const account = new MockAccountAdapter(client); const playground = new MockPlaygroundAdapter(); return { mode, client, account, computer: new ComputerService(client, account, playground), names: new JamNameService(client, account), playground }; } const account = new BrowserAccountAdapter(); const transport = new MiniJamTransport(); const playground = new RealPlaygroundAdapter(transport, account); const client = new RealJamClient(transport, account); return { mode, client, account, computer: new ComputerService(client, account, playground), names: new JamNameService(client, account), playground }; }
