import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Box,
  ChevronRight,
  CircleHelp,
  Cloud,
  Cpu,
  FileText,
  Folder,
  Gauge,
  HardDrive,
  Monitor,
  Network,
  Power,
  Search,
  Settings,
  ShieldCheck,
  SquareTerminal,
  Trash2,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import "../styles/preview.css";

type PreviewWindow = "welcome" | "terminal" | "computer" | null;

const desktopApps = [
  { id: "computer", label: "JAM Computer", icon: Monitor },
  { id: "files", label: "Files", icon: Folder },
  { id: "terminal", label: "Terminal", icon: SquareTerminal },
  { id: "services", label: "Services", icon: Box },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help", icon: CircleHelp },
  { id: "trash", label: "Trash", icon: Trash2 },
] as const;

const serviceRows = [
  ["Storage Service", "#1042"],
  ["Compute Service", "#1048"],
  ["AI Inference", "#1053"],
] as const;

const commandHelp = ["help", "status", "services", "clear"];

export function JamOsPreview() {
  const [booted, setBooted] = useState(false);
  const [bootProgress, setBootProgress] = useState(12);
  const [activeWindow, setActiveWindow] = useState<PreviewWindow>("welcome");
  const [startOpen, setStartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "JAM OS terminal v0.1.0",
    "Connected to MiniJAM Testnet",
    "Type 'help' to list commands.",
    "",
  ]);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const clock = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (booted) return;
    const timer = window.setInterval(() => {
      setBootProgress((value) => {
        if (value >= 96) return value;
        return Math.min(96, value + Math.max(2, Math.round((100 - value) / 8)));
      });
    }, 240);
    return () => window.clearInterval(timer);
  }, [booted]);

  const clock = useMemo(
    () => time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    [time],
  );

  const runCommand = (raw: string) => {
    const command = raw.trim().toLowerCase();
    if (!command) return;
    if (command === "clear") {
      setTerminalLines([]);
      return;
    }

    let output: string[] = [];
    if (command === "help") output = ["Available commands: help, status, services, clear"];
    else if (command === "status") output = ["network: online", "service: jam-computer-001", "state: ready"];
    else if (command === "services") output = serviceRows.map(([name, id]) => `${id}  ${name}  running`);
    else output = [`command not found: ${command}`];

    setTerminalLines((lines) => [...lines, `jam@computer:~$ ${raw}`, ...output, ""]);
  };

  const openDesktopApp = (id: (typeof desktopApps)[number]["id"]) => {
    setStartOpen(false);
    if (id === "terminal") setActiveWindow("terminal");
    else if (id === "computer" || id === "files" || id === "services") setActiveWindow("computer");
    else setActiveWindow("welcome");
  };

  if (!booted) {
    return (
      <main className="jam-preview boot-stage">
        <div className="boot-noise" />
        <div className="boot-center">
          <div className="boot-cube" aria-hidden="true"><Box size={54} strokeWidth={1.2} /></div>
          <div className="boot-wordmark">JAM OS</div>
          <div className="boot-subtitle">JAM Computer · AI Native Operating System</div>
          <div className="boot-progress-shell" aria-label="Boot progress">
            <div className="boot-progress-bar" style={{ width: `${bootProgress}%` }} />
          </div>
          <div className="boot-meta">
            <span>MiniJAM Testnet</span>
            <span>{bootProgress < 95 ? "Initializing services…" : "Ready"}</span>
          </div>
          <button className="boot-enter" onClick={() => { setBootProgress(100); setTimeout(() => setBooted(true), 180); }}>
            <Power size={15} /> Enter JAM Computer
          </button>
        </div>
        <div className="boot-footer">JAM OS 0.1.0 · PREVIEW BUILD</div>
      </main>
    );
  }

  return (
    <main className="jam-preview desktop-stage" onClick={() => startOpen && setStartOpen(false)}>
      <div className="wallpaper" aria-hidden="true">
        <div className="aurora aurora-a" />
        <div className="aurora aurora-b" />
        <div className="moon" />
        <div className="mountain mountain-back" />
        <div className="mountain mountain-front" />
        <div className="lake-glow" />
      </div>

      <header className="os-topbar">
        <div className="os-brand"><Box size={17} /> <span>JAM OS</span></div>
        <div className="os-top-status">
          <span className="top-live"><i /> LIVE</span>
          <span>MiniJAM Testnet</span>
          <Wifi size={15} />
          <span>{clock}</span>
        </div>
      </header>

      <aside className="desktop-shortcuts" aria-label="Desktop shortcuts">
        {desktopApps.map(({ id, label, icon: Icon }) => (
          <button key={id} className="preview-shortcut" onDoubleClick={() => openDesktopApp(id)} onClick={() => openDesktopApp(id)}>
            <span className={`shortcut-icon shortcut-${id}`}><Icon size={27} strokeWidth={1.45} /></span>
            <span>{label}</span>
          </button>
        ))}
      </aside>

      <section className="right-widgets">
        <article className="glass-card system-card">
          <div className="widget-title"><span>System</span><Gauge size={16} /></div>
          <Metric label="CPU" value="23%" width="23%" icon={<Cpu size={13} />} />
          <Metric label="Memory" value="1.2 / 4.0 GB" width="31%" icon={<Zap size={13} />} />
          <Metric label="Storage" value="18.6 / 64 GB" width="42%" icon={<HardDrive size={13} />} />
        </article>

        <article className="glass-card network-card">
          <div className="widget-title"><span>Network</span><Network size={16} /></div>
          <div className="network-values"><span>↑ 12.4 KB/s</span><span>↓ 34.7 KB/s</span></div>
          <div className="network-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        </article>

        <article className="glass-card services-card">
          <div className="widget-title"><span>JAM Services</span><span className="running-count"><i /> 3 Running</span></div>
          {serviceRows.map(([name, id]) => (
            <div className="service-row" key={id}><Box size={13} /><span>{name}</span><small>{id}</small><b>Running</b></div>
          ))}
        </article>

        <article className="glass-card logs-card">
          <div className="widget-title"><span>Latest Logs</span><ShieldCheck size={16} /></div>
          <pre>{`[${clock}:01] System initialized\n[${clock}:02] Network connected\n[${clock}:03] Services started\n[${clock}:04] Ready.`}</pre>
        </article>
      </section>

      {activeWindow === "welcome" && (
        <section className="preview-window welcome-window">
          <WindowBar title="Welcome to JAM OS" onClose={() => setActiveWindow(null)} />
          <div className="welcome-content">
            <div className="welcome-logo"><Box size={58} strokeWidth={1.05} /></div>
            <h1>JAM OS</h1>
            <p>JAM Computer is ready.</p>
            <div className="welcome-badges"><span><Cloud size={14} /> MiniJAM connected</span><span><Bot size={14} /> AI-ready</span></div>
            <button className="primary-preview-button" onClick={() => setActiveWindow("terminal")}>
              <ChevronRight size={17} /> Start exploring
            </button>
          </div>
        </section>
      )}

      {activeWindow === "terminal" && (
        <section className="preview-window terminal-window">
          <WindowBar title="Terminal" onClose={() => setActiveWindow(null)} />
          <div className="terminal-body">
            <div className="terminal-lines">
              {terminalLines.map((line, index) => <div key={`${index}-${line}`}>{line || "\u00a0"}</div>)}
            </div>
            <form className="terminal-prompt" onSubmit={(event) => { event.preventDefault(); runCommand(terminalInput); setTerminalInput(""); }}>
              <span>jam@computer:~$</span>
              <input value={terminalInput} onChange={(event) => setTerminalInput(event.target.value)} autoFocus spellCheck={false} />
            </form>
            <div className="terminal-hint">Try: {commandHelp.join(" · ")}</div>
          </div>
        </section>
      )}

      {activeWindow === "computer" && (
        <section className="preview-window computer-window">
          <WindowBar title="JAM Computer" onClose={() => setActiveWindow(null)} />
          <div className="computer-body">
            <div className="computer-hero"><div className="computer-icon"><Monitor size={38} /></div><div><small>THIS COMPUTER</small><h2>JAM Computer #001</h2><p>Personal compute environment backed by MiniJAM services.</p></div></div>
            <div className="computer-grid">
              <InfoTile icon={<Cpu />} label="Compute" value="Ready" />
              <InfoTile icon={<HardDrive />} label="Storage" value="18.6 GB" />
              <InfoTile icon={<Network />} label="Network" value="Online" />
              <InfoTile icon={<ShieldCheck />} label="Security" value="Verified" />
            </div>
            <div className="computer-files"><div className="files-heading"><span>Recent</span><small>JAM://computer/home</small></div><div className="fake-file"><Folder size={18} /><span>Sites</span><small>directory</small></div><div className="fake-file"><FileText size={18} /><span>README.jam</span><small>2 KB</small></div></div>
          </div>
        </section>
      )}

      <div className="desktop-caption">
        <Box size={15} />
        <span>JAM Computer</span>
        <small>the world computer, made personal</small>
      </div>

      <footer className="preview-taskbar">
        <button className="jam-start" onClick={(event) => { event.stopPropagation(); setStartOpen((value) => !value); }}><Box size={19} /></button>
        <div className="task-search"><Search size={15} /><span>Search JAM Computer</span></div>
        <div className="dock-icons">
          <button onClick={() => setActiveWindow("terminal")} title="Terminal"><SquareTerminal size={18} /></button>
          <button onClick={() => setActiveWindow("computer")} title="Files"><Folder size={18} /></button>
          <button onClick={() => setActiveWindow("computer")} title="JAM Computer"><Monitor size={18} /></button>
          <button onClick={() => setActiveWindow("welcome")} title="AI"><Bot size={18} /></button>
          <button onClick={() => setActiveWindow("welcome")} title="Settings"><Settings size={18} /></button>
        </div>
        <div className="tray"><span>⌃</span><Wifi size={15} /><span>ENG</span><div className="tray-clock"><b>{clock}</b><small>{time.toLocaleDateString()}</small></div></div>
      </footer>

      {startOpen && (
        <section className="preview-start-menu" onClick={(event) => event.stopPropagation()}>
          <div className="start-profile"><div className="profile-cube"><Box size={20} /></div><div><b>JAM Computer</b><small>MiniJAM Testnet</small></div></div>
          <div className="start-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps, files, services" /></div>
          <div className="start-app-grid">
            {desktopApps.filter((app) => app.label.toLowerCase().includes(query.toLowerCase())).slice(0, 6).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => openDesktopApp(id)}><span><Icon size={20} /></span><small>{label}</small></button>
            ))}
          </div>
          <div className="start-footer"><span>JAM OS 0.1.0</span><button onClick={() => setBooted(false)}><Power size={15} /> Power</button></div>
        </section>
      )}
    </main>
  );
}

function WindowBar({ title, onClose }: { title: string; onClose: () => void }) {
  return <div className="preview-window-bar"><span>{title}</span><div><button aria-label="Minimize">—</button><button aria-label="Maximize">□</button><button aria-label="Close" onClick={onClose}><X size={14} /></button></div></div>;
}

function Metric({ label, value, width, icon }: { label: string; value: string; width: string; icon: React.ReactNode }) {
  return <div className="metric"><div className="metric-label">{icon}<span>{label}</span><b>{value}</b></div><div className="meter"><i style={{ width }} /></div></div>;
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="info-tile"><span>{icon}</span><small>{label}</small><b>{value}</b></div>;
}
