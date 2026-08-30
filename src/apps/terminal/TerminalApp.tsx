import { useEffect, useState } from "react";
import type { JamOsRuntimeV2 } from "../../runtime/types";
import { Shell } from "../../shell/Shell";
import type { ShellContext } from "../../shell/context";
export function TerminalApp({ runtime, serviceId, openApp }: { runtime: JamOsRuntimeV2; serviceId: string | null; openApp: (id: string, args?: string) => void }) { const [account, setAccount] = useState<{ address: string } | null>(runtime.mode === "mock" ? { address: "5MockJAMComputerAccount" } : null); useEffect(() => { if (runtime.mode === "live") void runtime.account.current().then(setAccount); }, [runtime]); const context: ShellContext = { cwd: "/home/user", account, computerServiceId: serviceId, fs: serviceId ? runtime.fs.mount(serviceId) : null, names: runtime.names, runtime, openApp }; return <Shell context={context} />; }
