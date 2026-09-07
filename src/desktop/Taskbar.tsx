import { Activity, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { getAppManifest } from "../os/appRegistry";
import type { WindowInstance } from "./types";

export function Taskbar({ windows, mode, network, onOpen, onOpenControlCenter, onFocus }: { windows: WindowInstance[]; mode: string; network: string; onOpen: () => void; onOpenControlCenter: () => void; onFocus: (id: string) => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  return <footer className="taskbar dock" role="toolbar" aria-label="JAM Dock">
    <button className="start-button" onClick={onOpen} aria-label="Open JAM launcher"><span className="start-orb"><Activity size={15} /></span><span>JAM</span></button>
    <div className="task-items">{windows.map((item) => { const Icon = getAppManifest(item.appId).icon; return <button key={item.id} className={item.minimized ? "task-item minimized" : "task-item"} onClick={() => onFocus(item.id)} title={item.title}><Icon size={16} /><span>{item.title}</span><i /></button>; })}</div>
    <div className="task-status"><span className="network-label"><span className="health-dot" />{network}</span><span className="mode-pill">{mode.toUpperCase()}</span><button className="tray-expand" onClick={onOpenControlCenter} aria-label="Open JAM Control Center"><SlidersHorizontal size={15} /></button><span className="task-clock"><b>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b><small>{now.toLocaleDateString([], { month: "short", day: "numeric" })}</small></span></div>
  </footer>;
}
