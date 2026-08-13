import { useEffect, useState } from "react";
import { Code2, Gamepad2, Globe2, Monitor, Settings as SettingsIcon, SquareTerminal } from "lucide-react";
import { Browser } from "./apps/browser/Browser";
import { MyComputer } from "./apps/computer/MyComputer";
import { Doom } from "./apps/doom/Doom";
import { Playground } from "./apps/playground/Playground";
import { Settings } from "./apps/settings/Settings";
import { TerminalApp } from "./apps/terminal/TerminalApp";
import { BootScreen } from "./boot/BootScreen";
import { DesktopIcon } from "./desktop/DesktopIcon";
import { Taskbar } from "./desktop/Taskbar";
import { Window } from "./desktop/Window";
import type { WindowInstance } from "./desktop/types";
import { createRuntime, type Runtime } from "./runtime";
import type { ProvisionProgress } from "./jam/computer";
import "./styles/global.css";

const runtime: Runtime = createRuntime();
const apps = [
  { id: "computer", title: "My Computer", icon: Monitor, size: [720, 500] },
  { id: "terminal", title: "Terminal", icon: SquareTerminal, size: [760, 460] },
  { id: "playground", title: "Playground", icon: Code2, size: [1000, 700] },
  { id: "browser", title: "Browser", icon: Globe2, size: [900, 620] },
  { id: "doom", title: "DOOM", icon: Gamepad2, size: [720, 520] },
  { id: "settings", title: "Settings", icon: SettingsIcon, size: [520, 560] },
] as const;

type Phase = "boot" | "login" | "provisioning" | "desktop" | "error";

export default function App() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProvisionProgress[]>([]);
  const [error, setError] = useState("");
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [nextZ, setNextZ] = useState(10);
  const [showStart, setShowStart] = useState(false);
  const [selectedDesktopIcon, setSelectedDesktopIcon] = useState<string | null>(null);
  const networkName = import.meta.env.VITE_MINIJAM_NETWORK_NAME || "MiniJAM Testnet";

  useEffect(() => {
    if (phase !== "boot") return;
    const timer = window.setTimeout(() => setPhase("login"), 650);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const provision = async () => {
    setPhase("provisioning");
    setError("");
    setProgress([]);
    try {
      const result = await runtime.computer.provision((item) => setProgress((old) => [...old.filter((entry) => entry.step !== item.step), item]));
      setServiceId(result.serviceId);
      setWindows([{ id: `terminal-${Date.now()}`, appId: "terminal", title: "Terminal", x: 150, y: 80, width: 760, height: 460, zIndex: 10, minimized: false, maximized: false }]);
      setNextZ(11);
      setSelectedDesktopIcon("terminal");
      setPhase("desktop");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start JAM Computer");
      setPhase("error");
    }
  };

  const openApp = (appId: string, args?: string) => {
    const def = apps.find((app) => app.id === appId)!;
    setWindows((old) => {
      const existing = old.find((window) => window.appId === appId && appId !== "browser");
      if (existing) return old.map((window) => window.id === existing.id ? { ...window, minimized: false, zIndex: nextZ, args } : window);
      return [...old, { id: `${appId}-${Date.now()}`, appId, title: def.title, x: 120 + old.length * 24, y: 70 + old.length * 18, width: def.size[0], height: def.size[1], zIndex: nextZ, minimized: false, maximized: false, args }];
    });
    setNextZ((z) => z + 1);
    setSelectedDesktopIcon(appId);
    setShowStart(false);
  };
  const update = (id: string, fn: (window: WindowInstance) => WindowInstance) => setWindows((old) => old.map((window) => window.id === id ? fn(window) : window));
  const focus = (id: string) => { setNextZ((z) => z + 1); update(id, (window) => ({ ...window, zIndex: nextZ, minimized: false })); };
  const appContent = (item: WindowInstance) => { switch (item.appId) { case "computer": return <MyComputer runtime={runtime} serviceId={serviceId} openEditor={(path) => openApp("playground", path)} />; case "settings": return <Settings runtime={runtime} serviceId={serviceId} />; case "browser": return <Browser runtime={runtime} serviceId={serviceId} />; case "terminal": return <TerminalApp runtime={runtime} serviceId={serviceId} openApp={openApp} />; case "playground": return <Playground runtime={runtime} serviceId={serviceId} />; case "doom": return <Doom mode={runtime.mode} openPlayground={() => openApp("playground")} />; } };

  if (phase !== "desktop") return <BootScreen phase={phase === "error" ? "error" : phase} mode={runtime.mode} networkName={networkName} progress={progress} error={error} onSignIn={() => void provision()} onRetry={() => void provision()} />;
  return <main className="desktop-shell"><div className="desktop-background" onClick={() => setSelectedDesktopIcon(null)}><div className="brand-mark"><span>JAM COMPUTER</span><small>{runtime.mode === "live" ? "LIVE · MiniJAM-backed services" : "DEMO · local mock runtime"}</small></div><div className="desktop-icons">{apps.map((app) => <DesktopIcon key={app.id} icon={app.icon} title={app.title} selected={selectedDesktopIcon === app.id} onSelect={() => setSelectedDesktopIcon(app.id)} onOpen={() => openApp(app.id)} />)}</div>{windows.map((item) => <Window key={item.id} window={item} onFocus={() => focus(item.id)} onMove={(x, y) => update(item.id, (window) => ({ ...window, x, y }))} onResize={(width, height) => update(item.id, (window) => ({ ...window, width, height }))} onMinimize={() => update(item.id, (window) => ({ ...window, minimized: true }))} onMaximize={() => update(item.id, (window) => ({ ...window, maximized: !window.maximized }))} onClose={() => setWindows((old) => old.filter((window) => window.id !== item.id))}>{appContent(item)}</Window>)}</div><Taskbar windows={windows} mode={runtime.mode} network={networkName} onOpen={() => setShowStart((value) => !value)} onFocus={focus} />{showStart && <div className="start-menu"><div className="start-heading">JAM Computer · {runtime.mode.toUpperCase()}</div>{apps.map((app) => { const Icon = app.icon; return <button key={app.id} onClick={() => openApp(app.id)}><Icon size={18} strokeWidth={1.5} />{app.title}</button>; })}</div>}</main>;
}
