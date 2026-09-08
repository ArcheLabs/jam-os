import { getAppManifest } from "../os/appRegistry";
import type { WindowInstance } from "./types";
import { JamAppIcon } from "../ui/icons";
import { JamLogo } from "../ui/brand/JamLogo";

const dockAppIds = ["computer", "files", "browser", "terminal", "playground", "settings", "doom"];

export function Taskbar({ windows, onOpen, onOpenApp, onFocus }: { windows: WindowInstance[]; onOpen: () => void; onOpenApp: (id: string) => void; onFocus: (id: string) => void }) {
  return <footer className="taskbar dock" role="toolbar" aria-label="JAM Dock">
    <button className="start-button" onClick={onOpen} aria-label="Open JAM launcher"><span className="start-orb"><JamLogo variant="symbol" size={38} /></span><span>JAM</span></button>
    <div className="task-items">{dockAppIds.map((appId) => { const manifest = getAppManifest(appId); const running = windows.find((item) => item.appId === appId); return <button key={appId} className={`task-item dock-item ${running && !running.minimized ? "running" : ""} ${running?.minimized ? "minimized" : ""}`} onClick={() => running ? onFocus(running.id) : onOpenApp(appId)} title={manifest.name} aria-label={running ? `Focus ${manifest.name}` : `Open ${manifest.name}`}><JamAppIcon appId={appId} context="dock" fallbackIcon={manifest.icon} /><span>{manifest.name}</span><i /></button>; })}</div>
  </footer>;
}
