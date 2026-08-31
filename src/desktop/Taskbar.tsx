import { BatteryMedium, ChevronUp, Volume2, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { getAppManifest } from "../os/appRegistry";
import type { WindowInstance } from "./types";

export function Taskbar({ windows, mode, network, onOpen, onFocus }: { windows: WindowInstance[]; mode: string; network: string; onOpen: () => void; onFocus: (id: string) => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  return <footer className="taskbar">
    <button className="start-button" onClick={onOpen} aria-label="Open Start menu"><span className="start-orb">◆</span><span>JAM</span></button>
    <div className="task-items">{windows.map((item) => { const Icon = getAppManifest(item.appId).icon; return <button key={item.id} className={item.minimized ? "task-item minimized" : "task-item"} onClick={() => onFocus(item.id)} title={item.title}><Icon size={16} /><span>{item.title}</span><i /></button>; })}</div>
    <div className="task-status"><button className="tray-expand" aria-label="Show hidden status icons"><ChevronUp size={13} /></button><Wifi size={14} /><Volume2 size={14} /><BatteryMedium size={16} /><span className="network-label"><span className="health-dot" />{network}</span><span className="mode-pill">{mode.toUpperCase()}</span><span className="task-clock"><b>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b><small>{now.toLocaleDateString([], { month: "short", day: "numeric" })}</small></span></div>
  </footer>;
}
