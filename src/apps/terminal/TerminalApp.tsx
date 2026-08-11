import type { Runtime } from "../../runtime";
import { Shell } from "../../shell/Shell";
import type { ShellContext } from "../../shell/context";
export function TerminalApp({ runtime, serviceId, openApp }: { runtime: Runtime; serviceId: string | null; openApp: (id: string, args?: string) => void }) { const context: ShellContext = { cwd: "/home/user", account: runtime.mode === "mock" ? { address: "5MockJAMComputerAccount" } : null, computerServiceId: serviceId, fs: serviceId ? runtime.computer.fs(serviceId) : null, names: runtime.names, runtime, openApp }; return <Shell context={context} />; }
