import type { ProvisionProgress, ProvisionStep } from "../jam/computer";

const labels: Record<ProvisionStep, string> = {
  account: "Account",
  computer: "Computer Service",
  filesystem: "Filesystem",
  network: "JAM Network",
};

export function BootScreen({ phase, mode, networkName, progress, error, onSignIn, onRetry }: { phase: "boot" | "login" | "provisioning" | "error"; mode: "mock" | "live"; networkName: string; progress: ProvisionProgress[]; error?: string; onSignIn: () => void; onRetry: () => void }) {
  const live = mode === "live";
  if (phase === "boot") return <main className="boot-screen"><div className="boot-loader"><span className="boot-logo">JAM</span><span>Starting JAM Computer…</span></div></main>;
  if (phase === "login") return <main className="boot-screen"><section className="login-card"><div className="login-brand">JAM</div><h1>JAM Computer</h1><p>A browser computer backed by MiniJAM services.</p><button className="login-button" onClick={onSignIn}>{live ? "Connect Polkadot & start" : "Enter demo"}</button><small>{live ? `LIVE · ${networkName}` : `DEMO · local mock runtime · ${networkName}`}</small></section></main>;
  return <main className="boot-screen"><section className="provision-card"><div className="login-brand">JAM</div><h1>{phase === "error" ? "Computer setup paused" : live ? "Connecting your JAM Computer…" : "Preparing demo computer…"}</h1>{phase === "error" ? <><p className="error-text">{error || "Unable to start JAM Computer."}</p><button className="login-button" onClick={onRetry}>Try again</button></> : <div className="provision-list">{(["account", "computer", "filesystem", "network"] as ProvisionStep[]).map((step) => { const item = progress.find((entry) => entry.step === step); return <div className="provision-row" key={step}><span className={item?.status === "done" ? "provision-check done" : "provision-check"}>{item?.status === "done" ? "✓" : "●"}</span><span>{labels[step]}</span><small>{item?.detail || (item?.status === "active" ? "Working…" : "Waiting…")}</small></div>; })}</div>}</section></main>;
}
