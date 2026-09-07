import { Activity, CheckCircle2, CircleUserRound, Palette, Server, SlidersHorizontal, X } from "lucide-react";
import type { AccountInfo } from "../../jam/types";
import type { JamOsRuntimeV2 } from "../../runtime/types";
import { useEffect, useState } from "react";

export function ControlCenter({ runtime, networkName, serviceId, account, onClose }: { runtime: JamOsRuntimeV2; networkName: string; serviceId: string | null; account: AccountInfo | null; onClose: () => void }) {
  const [systemStatus, setSystemStatus] = useState("Checking");
  useEffect(() => { void runtime.system.getInfo().then((info) => setSystemStatus(info.status || "Ready")).catch(() => setSystemStatus("Unavailable")); }, [runtime]);
  const connected = runtime.mode === "mock" || systemStatus.toLowerCase() === "ready" || systemStatus.toLowerCase() === "online";
  return <aside className="control-center" role="dialog" aria-label="JAM Control Center" onClick={(event) => event.stopPropagation()}>
    <header className="control-center-header"><div><span className="control-center-kicker">JAM OS</span><strong>Control Center</strong></div><button className="control-center-close" onClick={onClose} aria-label="Close Control Center"><X size={17} /></button></header>
    <section className="control-hero"><div className="control-hero-icon"><Activity size={20} /></div><div><strong>MiniJAM Network</strong><span>{networkName}</span></div><span className={`control-status ${connected ? "online" : "offline"}`}><i />{connected ? "Connected" : "Offline"}</span></section>
    <div className="control-grid">
      <article className="control-tile"><Server size={18} /><span>Computer Service</span><strong>{serviceId ? "Running" : "Not started"}</strong></article>
      <article className="control-tile"><CircleUserRound size={18} /><span>Wallet</span><strong>{account ? "Connected" : "Not connected"}</strong></article>
      <article className="control-tile"><Palette size={18} /><span>Appearance</span><strong>JAM Dark</strong></article>
      <article className="control-tile"><SlidersHorizontal size={18} /><span>Motion</span><strong>System default</strong></article>
    </div>
    <footer className="control-center-footer"><CheckCircle2 size={15} /><span>Only JAM-native status is shown here. Browser hardware controls are not simulated.</span></footer>
  </aside>;
}
