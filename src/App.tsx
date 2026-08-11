import { useMemo, useState } from "react";
import { Browser } from "./apps/browser/Browser";
import { MyComputer } from "./apps/computer/MyComputer";
import { Doom } from "./apps/doom/Doom";
import { Playground } from "./apps/playground/Playground";
import { Settings } from "./apps/settings/Settings";
import { TerminalApp } from "./apps/terminal/TerminalApp";
import { DesktopIcon } from "./desktop/DesktopIcon";
import { Taskbar } from "./desktop/Taskbar";
import { Window } from "./desktop/Window";
import type { WindowInstance } from "./desktop/types";
import { createRuntime, type Runtime } from "./runtime";
import "./styles/global.css";

const runtime: Runtime = createRuntime();
const apps = [
  { id: "computer", title: "My Computer", icon: "💻", size: [720, 500] },
  { id: "settings", title: "Settings", icon: "⚙", size: [520, 560] },
  { id: "browser", title: "Browser", icon: "◎", size: [900, 620] },
  { id: "terminal", title: "Terminal", icon: ">_", size: [700, 420] },
  { id: "playground", title: "Playground", icon: "⌘", size: [1000, 700] },
  { id: "doom", title: "DOOM", icon: "✹", size: [720, 520] },
] as const;
export default function App() { const [serviceId, setServiceId] = useState<string | null>(() => localStorage.getItem("jam-computer-service")); const [windows, setWindows] = useState<WindowInstance[]>([]); const [nextZ, setNextZ] = useState(10); const [showStart, setShowStart] = useState(false); const openApp = (appId: string, args?: string) => { const def = apps.find((a) => a.id === appId)!; setWindows((old) => { const existing = old.find((w) => w.appId === appId && def.id !== "browser"); if (existing) return old.map((w) => w.id === existing.id ? { ...w, minimized: false, zIndex: nextZ, args } : w); return [...old, { id: `${appId}-${Date.now()}`, appId, title: def.title, x: 120 + old.length * 24, y: 70 + old.length * 18, width: def.size[0], height: def.size[1], zIndex: nextZ, minimized: false, maximized: false, args }]; }); setNextZ((z) => z + 1); setShowStart(false); }; const update = (id: string, fn: (w: WindowInstance) => WindowInstance) => setWindows((old) => old.map((w) => w.id === id ? fn(w) : w)); const focus = (id: string) => { setNextZ((z) => z + 1); update(id, (w) => ({ ...w, zIndex: nextZ, minimized: false })); }; const setService = (id: string) => { localStorage.setItem("jam-computer-service", id); setServiceId(id); }; const appContent = (item: WindowInstance) => { switch (item.appId) { case "computer": return <MyComputer runtime={runtime} serviceId={serviceId} openEditor={(path) => openApp("playground", path)} />; case "settings": return <Settings runtime={runtime} serviceId={serviceId} onService={setService} />; case "browser": return <Browser runtime={runtime} serviceId={serviceId} />; case "terminal": return <TerminalApp runtime={runtime} serviceId={serviceId} openApp={openApp} />; case "playground": return <Playground runtime={runtime} serviceId={serviceId} />; case "doom": return <Doom />; } }; const networkName = import.meta.env.VITE_MINIJAM_NETWORK_NAME || "MiniJAM Testnet"; return <main className="desktop-shell"><div className="desktop-background"><div className="brand-mark"><span>JAM COMPUTER</span><small>A computer that runs on JAM.</small></div><div className="desktop-icons">{apps.map((app) => <DesktopIcon key={app.id} icon={app.icon} title={app.title} onOpen={() => openApp(app.id)} />)}</div>{windows.map((item) => <Window key={item.id} window={item} onFocus={() => focus(item.id)} onMove={(x, y) => update(item.id, (w) => ({ ...w, x, y }))} onResize={(width, height) => update(item.id, (w) => ({ ...w, width, height }))} onMinimize={() => update(item.id, (w) => ({ ...w, minimized: true }))} onMaximize={() => update(item.id, (w) => ({ ...w, maximized: !w.maximized }))} onClose={() => setWindows((old) => old.filter((w) => w.id !== item.id))}>{appContent(item)}</Window>)}</div><Taskbar windows={windows} mode={runtime.mode} network={networkName} onOpen={() => setShowStart((v) => !v)} onFocus={focus} />{showStart && <div className="start-menu"><div className="start-heading">JAM Computer</div>{apps.map((app) => <button key={app.id} onClick={() => openApp(app.id)}><span>{app.icon}</span>{app.title}</button>)}</div>}</main>; }
