import { Options16Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { getAppManifest } from "../os/appRegistry";
import type { WindowInstance } from "./types";
import { JamAppIcon } from "../ui/icons";
import { JamLogo } from "../ui/brand/JamLogo";

const dockAppIds = ["computer", "files", "browser", "terminal", "playground", "settings", "doom"];

export function Taskbar({ windows, mode, network, onOpen, onOpenApp, onOpenControlCenter, onFocus }: { windows: WindowInstance[]; mode: string; network: string; onOpen: () => void; onOpenApp: (id: string) => void; onOpenControlCenter: () => void; onFocus: (id: string) => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  return <footer className="taskbar dock" role="toolbar" aria-label="JAM Dock">
    <button className="start-button" onClick={onOpen} aria-label="Open JAM launcher"><span className="start-orb"><JamLogo variant="symbol" size={38} /></span><span>JAM</span></button>
    <div className="task-items">{dockAppIds.map((appId) => { const manifest = getAppManifest(appId); const running = windows.find((item) => item.appId === appId); return <button key={appId} className={`task-item dock-item ${running && !running.minimized ? "running" : ""} ${running?.minimized ? "minimized" : ""}`} onClick={() => running ? onFocus(running.id) : onOpenApp(appId)} title={manifest.name} aria-label={running ? `Focus ${manifest.name}` : `Open ${manifest.name}`}><JamAppIcon appId={appId} context="dock" fallbackIcon={manifest.icon} /><span>{manifest.name}</span><i /></button>; })}</div>
    <div className="task-status"><span className="network-label"><span className="health-dot" />{network}</span><span className="mode-pill">{mode.toUpperCase()}</span><button className="tray-expand" onClick={onOpenControlCenter} aria-label="Open JAM Control Center"><Options16Regular fontSize={16} primaryFill="currentColor" /></button><span className="task-clock"><b>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b><small>{now.toLocaleDateString([], { month: "short", day: "numeric" })}</small></span></div>
  </footer>;
}
