import type { ProvisionProgress, ProvisionStep } from "../jam/computer";
import type { AccountInfo } from "../jam/types";

const labels: Record<ProvisionStep, string> = {
  account: "Account",
  computer: "Computer Service",
  filesystem: "Filesystem",
  network: "JAM Network",
};

function shortAddress(address: string) {
  if (address.length <= 22) return address;
  return `${address.slice(0, 12)}…${address.slice(-10)}`;
}

export function BootScreen({ phase, mode, networkName, account, progress, error, onSignIn, onContinue, onRetry }: { phase: "boot" | "login" | "connecting" | "account" | "provisioning" | "error"; mode: "mock" | "live"; networkName: string; account: AccountInfo | null; progress: ProvisionProgress[]; error?: string; onSignIn: () => void; onContinue: () => void; onRetry: () => void }) {
  const live = mode === "live";

  if (phase === "boot") return <main className="boot-screen computer-boot"><div className="computer-frame"><div className="computer-display"><div className="boot-corner">MINIJAM SYSTEM / 0.1</div><div className="boot-loader"><span className="boot-logo">JAM</span><strong>JAM Computer</strong><div className="boot-track"><span /></div><div className="boot-lines"><span>Initializing PVM runtime</span><span>Mounting network services</span><span>Preparing desktop</span></div></div></div><div className="computer-base"><span /></div></div></main>;

  if (phase === "login" || phase === "connecting") return <main className="boot-screen"><section className="login-card login-machine"><div className="login-brand">JAM</div><h1>JAM Computer</h1><p>Your computer, backed by MiniJAM.</p>{error && <p className="login-inline-error">{error}</p>}<button className="login-button" disabled={phase === "connecting"} onClick={onSignIn}>{phase === "connecting" ? "Connecting…" : live ? "Connect Polkadot" : "Enter demo"}</button><small>{live ? `LIVE · ${networkName}` : `DEMO · local mock runtime · ${networkName}`}</small></section></main>;

  if (phase === "account" && account) return <main className="boot-screen"><section className="account-card"><div className="account-avatar">{(account.name || "J").slice(0, 1).toUpperCase()}</div><span className="account-ready">ACCOUNT CONNECTED</span><h1>{account.name || "Wallet account"}</h1><div className="account-details"><div><span>ADDRESS</span><strong className="mono">{shortAddress(account.address)}</strong></div>{account.source && <div><span>WALLET</span><strong>{account.source}</strong></div>}<div><span>NETWORK</span><strong>{networkName}</strong></div></div><button className="login-button account-enter" onClick={onContinue}>Start JAM Computer</button><small>Your Computer Service is created or restored after you continue.</small></section></main>;

  return <main className="boot-screen"><section className="provision-card"><div className="login-brand">JAM</div><h1>{phase === "error" ? "Computer setup paused" : live ? "Starting your JAM Computer…" : "Preparing demo computer…"}</h1>{phase === "error" ? <><p className="error-text">{error || "Unable to start JAM Computer."}</p><button className="login-button" onClick={onRetry}>Try again</button></> : <div className="provision-list">{(["account", "network", "computer", "filesystem"] as ProvisionStep[]).map((step) => { const item = progress.find((entry) => entry.step === step); return <div className="provision-row" key={step}><span className={item?.status === "done" ? "provision-check done" : "provision-check"}>{item?.status === "done" ? "✓" : "●"}</span><span>{labels[step]}</span><small>{item?.detail || (item?.status === "active" ? "Working…" : "Waiting…")}</small></div>; })}</div>}</section></main>;
}
