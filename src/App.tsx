import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowCounterclockwise16Regular, NetworkCheck20Regular, Options16Regular, Power24Regular, Search16Regular } from "@fluentui/react-icons";
import { BootScreen } from "./boot/BootScreen";
import { DesktopIcon } from "./desktop/DesktopIcon";
import { Taskbar } from "./desktop/Taskbar";
import { Window } from "./desktop/Window";
import type { WindowInstance } from "./desktop/types";
import { createRuntime } from "./runtime";
import type { ProvisionProgress } from "./jam/computer";
import type { AccountInfo } from "./jam/types";
import { getAppManifest, systemApps } from "./os/appRegistry";
import { ControlCenter } from "./ui/shell/ControlCenter";
import { JamLogo } from "./ui/brand/JamLogo";
import { JamAppIcon } from "./ui/icons";
import { IconGallery } from "./ui/icons/IconGallery";
import { JamWallpaper } from "./ui/shell/JamWallpaper";
import "./styles/global.css";
import "./styles/boot-polish.css";
import "./styles/os.css";
import "./styles/theme/tokens.css";
import "./styles/theme/materials.css";
import "./styles/theme/typography.css";
import "./styles/theme/motion.css";
import "./styles/theme/icons.css";
import "./styles/modern-os.css";
import { PublicComputerPage } from "./public/PublicComputerPage";

type Phase = "boot" | "login" | "connecting" | "account" | "provisioning" | "desktop" | "error";

export default function App() {
  const previewParam = new URLSearchParams(window.location.search).get("preview");
  const preview = previewParam === "1" || previewParam === "boot" || previewParam === "login" || previewParam === "desktop" || previewParam === "desktop-window" || previewParam === "icons" || window.location.hash === "#preview";
  const runtime = useMemo(() => createRuntime(preview), [preview]);
  const publicName = window.location.pathname.match(/^\/@([a-z0-9-]+)$/i)?.[1]?.toLowerCase();
  const initialPhase: Phase = previewParam === "login" ? "login" : previewParam === "desktop" || previewParam === "desktop-window" ? "desktop" : "boot";
  const [phase, setPhase] = useState<Phase>(initialPhase); const [account, setAccount] = useState<AccountInfo | null>(null); const [serviceId, setServiceId] = useState<string | null>(null); const [progress, setProgress] = useState<ProvisionProgress[]>([]); const [error, setError] = useState(""); const [windows, setWindows] = useState<WindowInstance[]>([]); const [showStart, setShowStart] = useState(false); const [showControlCenter, setShowControlCenter] = useState(false); const [selected, setSelected] = useState<string | null>(null); const [networkName, setNetworkName] = useState("MiniJAM"); const seededPreviewDesktop = useRef(false); const zIndex = useRef(20);
  useEffect(() => { if (phase !== "boot") return; const timer = window.setTimeout(() => setPhase("login"), 1200); return () => window.clearTimeout(timer); }, [phase]);
  useEffect(() => { void runtime.network.getInfo().then((info) => setNetworkName(info.name)).catch(() => undefined); }, [runtime]);
  if (publicName) return <PublicComputerPage name={publicName} runtime={runtime} />;
  if (previewParam === "icons") return <IconGallery />;
  const connectAccount = async () => { setPhase("connecting"); setError(""); try { const connected = await runtime.account.connect(); setAccount(connected); setPhase("account"); runtime.events.emit?.("account:connected", connected); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to connect account"); setPhase("login"); } };
  const openApp = (appId: string, args?: string) => { const manifest = getAppManifest(appId); setWindows((old) => { const existing = manifest.singleton ? old.find((item) => item.appId === appId) : undefined; if (existing) return old.map((item) => item.id === existing.id ? { ...item, minimized: false, args, zIndex: ++zIndex.current } : item); const offset = old.length * 26; return [...old, { id: `${appId}-${Date.now()}`, appId, title: manifest.name, x: 105 + offset, y: 58 + offset, width: manifest.defaultWidth, height: manifest.defaultHeight, zIndex: ++zIndex.current, minimized: false, maximized: false, args }]; }); setSelected(appId); setShowStart(false); };
  useEffect(() => { if (phase !== "desktop" || previewParam !== "desktop-window" || seededPreviewDesktop.current) return; seededPreviewDesktop.current = true; const files = getAppManifest("files"); const settings = getAppManifest("settings"); zIndex.current = 22; setWindows([{ id: "preview-files", appId: files.id, title: files.name, x: 330, y: 105, width: 700, height: 485, zIndex: 21, minimized: false, maximized: false }, { id: "preview-settings", appId: settings.id, title: settings.name, x: 545, y: 220, width: 580, height: 520, zIndex: 22, minimized: false, maximized: false }]); setSelected("settings"); }, [phase, previewParam]);
  const provision = async () => { setPhase("provisioning"); setProgress([]); setError(""); try { const result = await runtime.computer.provision((item) => setProgress((old) => [...old.filter((entry) => entry.step !== item.step), item])); setAccount(result.account); setServiceId(result.serviceId); setPhase("desktop"); runtime.events.emit?.("service:started", result.serviceId); openApp("computer"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to start JAM Computer"); setPhase("error"); } };
  const updateWindow = (id: string, fn: (item: WindowInstance) => WindowInstance) => setWindows((old) => old.map((item) => item.id === id ? fn(item) : item));
  const focus = (id: string) => { const next = ++zIndex.current; updateWindow(id, (item) => ({ ...item, zIndex: next, minimized: false })); };
  const appContent = (item: WindowInstance) => { const Component = getAppManifest(item.appId).component; return <Component runtime={runtime} serviceId={serviceId} openApp={openApp} />; };
  if (phase !== "desktop") return <BootScreen phase={phase} mode={runtime.mode} networkName={networkName} account={account} progress={progress} error={error} onSignIn={() => void connectAccount()} onContinue={() => void provision()} onRetry={() => void provision()} />;
  const desktopApps = systemApps.filter((app) => app.id !== "services");
  const activeWindowId = windows.reduce<WindowInstance | null>((active, item) => !active || item.zIndex > active.zIndex ? item : active, null)?.id;
  return <main className="desktop-shell" onClick={() => { setShowStart(false); setShowControlCenter(false); }}><div className="desktop-background"><JamWallpaper mode="desktop" /><header className="os-topbar"><div className="os-brand"><JamLogo variant="symbol" size={22} /><strong>JAM OS</strong></div><nav className="os-menu-links" aria-label="JAM OS menu"><span>File</span><span>Edit</span><span>View</span><span>Go</span><span>Window</span><span>Help</span></nav><div className="topbar-status"><NetworkCheck20Regular fontSize={15} primaryFill="currentColor" /><span>{networkName}</span>{runtime.mode === "mock" && <span className="topbar-mode-pill">Preview</span>}<span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><button className="topbar-control" onClick={(event) => { event.stopPropagation(); setShowControlCenter((value) => !value); setShowStart(false); }} aria-label="Open JAM Control Center"><Options16Regular fontSize={16} primaryFill="currentColor" /></button></div></header><aside className="desktop-icons" aria-label="Desktop applications">{desktopApps.filter((app) => app.id === "computer" || app.id === "trash").map((app) => <DesktopIcon key={app.id} appId={app.id} icon={app.icon} title={app.name} selected={selected === app.id} onSelect={() => setSelected(app.id)} onOpen={() => openApp(app.id)} />)}</aside>{windows.map((item) => <Window key={item.id} window={item} active={item.id === activeWindowId} onFocus={() => focus(item.id)} onMove={(x, y) => updateWindow(item.id, (current) => ({ ...current, x, y }))} onResize={(width, height) => updateWindow(item.id, (current) => ({ ...current, width, height }))} onMinimize={() => updateWindow(item.id, (current) => ({ ...current, minimized: true }))} onMaximize={() => updateWindow(item.id, (current) => ({ ...current, maximized: !current.maximized }))} onClose={() => setWindows((old) => old.filter((current) => current.id !== item.id))}>{appContent(item)}</Window>)}</div><Taskbar windows={windows} onOpen={() => { setShowStart((value) => !value); setShowControlCenter(false); }} onOpenApp={openApp} onFocus={focus} />{showStart && <StartMenu openApp={openApp} />}{showControlCenter && <ControlCenter runtime={runtime} networkName={networkName} serviceId={serviceId} account={account} onClose={() => setShowControlCenter(false)} />}</main>;
}

function StartMenu({ openApp }: { openApp: (id: string) => void }) { const [query, setQuery] = useState(""); const apps = systemApps.filter((app) => app.id !== "trash" && app.name.toLowerCase().includes(query.toLowerCase())); return <div className="start-menu" onClick={(event) => event.stopPropagation()}><div className="start-heading"><JamLogo variant="symbol" size={28} /><div><strong>JAM Computer</strong><small>Applications</small></div></div><label className="start-search"><Search16Regular fontSize={16} primaryFill="currentColor" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps" autoFocus /></label><div className="start-label">Applications</div>{apps.map((app) => <button key={app.id} onClick={() => openApp(app.id)}><JamAppIcon appId={app.id} context="launcher" fallbackIcon={app.icon} /><span>{app.name}</span></button>)}<div className="start-footer"><button><Power24Regular fontSize={16} primaryFill="currentColor" /> Shutdown</button><button><ArrowCounterclockwise16Regular fontSize={16} primaryFill="currentColor" /> Restart</button></div></div>; }
