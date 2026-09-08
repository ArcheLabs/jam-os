import { Network } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProvisionProgress, ProvisionStep } from "../jam/computer";
import type { AccountInfo } from "../jam/types";
import { JamLogo } from "../ui/brand/JamLogo";
import { JamWallpaper } from "../ui/shell/JamWallpaper";

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
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  if (phase === "boot") return <main className="boot-screen jam-boot-screen"><JamWallpaper mode="boot" /><div className="boot-center"><JamLogo variant="symbol" size={96} /><span className="boot-wordmark">JAM OS</span><div className="boot-dots" aria-label="Starting JAM OS"><i /><i /><i /><i /></div></div></main>;

  if (phase === "login" || phase === "connecting") return <main className="boot-screen login-screen"><JamWallpaper mode="login" /><header className="login-status-bar"><JamLogo variant="full" size={24} /><div><Network size={14} /><span>{networkName}</span>{!live && <span className="status-pill">Preview</span>}</div></header><div className="login-layout"><section className="login-clock"><strong>{time}</strong><small>{date}</small></section><section className="login-card login-machine"><JamLogo variant="symbol" size={82} /><h1>Welcome back</h1>{error && <p className="login-inline-error">{error}</p>}<button className="login-button jam-primary-button" disabled={phase === "connecting"} onClick={onSignIn}>{phase === "connecting" ? "Connecting…" : live ? "Connect account" : "Enter JAM Computer"}</button><span className="login-footer">JAM OS</span></section></div></main>;

  if (phase === "account" && account) return <main className="boot-screen login-screen"><JamWallpaper mode="login" /><header className="login-status-bar"><JamLogo variant="full" size={28} /><div><Network size={14} /><span>{networkName}</span><span className="status-pill">CONNECTED</span></div></header><section className="account-card"><div className="account-avatar">{(account.name || "J").slice(0, 1).toUpperCase()}</div><span className="account-ready">ACCOUNT CONNECTED</span><h1>{account.name || "Wallet account"}</h1><div className="account-details"><div><span>ADDRESS</span><strong className="mono">{shortAddress(account.address)}</strong></div>{account.source && <div><span>WALLET</span><strong>{account.source}</strong></div>}<div><span>NETWORK</span><strong>{networkName}</strong></div></div><button className="login-button account-enter" onClick={onContinue}>Start JAM Computer</button><small>Your Computer Service is created or restored after you continue.</small></section></main>;

  return <main className="boot-screen login-screen"><JamWallpaper mode="login" /><section className="provision-card"><JamLogo variant="symbol" size={58} /><div className="login-brand">JAM OS</div><h1>{phase === "error" ? "Computer setup paused" : "Preparing your JAM Computer"}</h1>{phase === "error" ? <><p className="error-text">{error || "Unable to start JAM Computer."}</p><button className="login-button" onClick={onRetry}>Try again</button></> : <div className="provision-list">{(["account", "network", "computer", "filesystem"] as ProvisionStep[]).map((step) => { const item = progress.find((entry) => entry.step === step); return <div className="provision-row" key={step}><span className={item?.status === "done" ? "provision-check done" : "provision-check"}>{item?.status === "done" ? "✓" : "●"}</span><span>{labels[step]}</span><small>{item?.detail || (item?.status === "active" ? "Working…" : "Waiting…")}</small></div>; })}<p className="provision-next">Starting desktop…</p></div>}</section></main>;
}
