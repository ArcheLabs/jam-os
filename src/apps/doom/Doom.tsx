import { useEffect, useState } from "react";
import { ShieldAlert, Trophy, Play, RotateCcw } from "lucide-react";
import type { JamOsRuntimeV2 } from "../../runtime/types";
import type { DoomLeaderboardEntry, DoomResult, DoomRuntimeStatus, DoomSession } from "../../runtime/types";
import { DoomGame } from "./DoomGame";

type View = "home" | "leaderboard" | "running" | "result";
const ACTIVE_SESSION_KEY = "jam-os:doom:active-run";
function shortAccount(account: string) { return account.length > 14 ? `${account.slice(0, 7)}…${account.slice(-5)}` : account; }

export function Doom({ runtime, openPlayground: _openPlayground }: { runtime: JamOsRuntimeV2; openPlayground: () => void }) {
  const [view, setView] = useState<View>("home");
  const [status, setStatus] = useState<DoomRuntimeStatus>("unavailable");
  const [session, setSession] = useState<DoomSession | null>(null);
  const [result, setResult] = useState<DoomResult | null>(null);
  const [scores, setScores] = useState<DoomLeaderboardEntry[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void runtime.doom.status().then(setStatus);
    void runtime.account.current().then((current) => setAccount(current?.address || null));
    try {
      const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (saved) { const restored = JSON.parse(saved) as DoomSession; void runtime.doom.getState(restored.id).then(() => { setSession(restored); setStatus("running"); setView("running"); }).catch(() => localStorage.removeItem(ACTIVE_SESSION_KEY)); }
    } catch { localStorage.removeItem(ACTIVE_SESSION_KEY); }
  }, [runtime]);
  const start = async () => { try { setError(""); const next = await runtime.doom.createSession({ map: "E1M1", difficulty: "Hurt Me Plenty" }); localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(next)); setSession(next); setStatus("running"); setView("running"); } catch (cause) { setError(cause instanceof Error ? cause.message : "DOOM runtime unavailable"); } };
  const finish = (next: DoomResult) => { localStorage.removeItem(ACTIVE_SESSION_KEY); setResult(next); setSession(null); setStatus("ready"); setView("result"); };
  const loadScores = async (mine = false) => { if (!runtime.doom.leaderboard) return; const currentAccount = mine ? account || (await runtime.account.current())?.address : undefined; setScores(await runtime.doom.leaderboard(currentAccount ? { account: currentAccount } : undefined)); setView("leaderboard"); };
  if (view === "running" && session) return <DoomGame runtime={runtime} session={session} onFinish={finish} />;
  if (view === "leaderboard") return <div className="doom-app doom-leaderboard"><div className="doom-header"><span className="doom-mark small">DOOM</span><button onClick={() => setView("home")}>Back</button></div><div className="doom-tabs"><button className="active">SCORES</button><button onClick={() => void loadScores(true)}>MY BEST</button></div><div className="doom-demo-label"><ShieldAlert size={14} /> E1M1 · Skill 3 · PolkaVM Runner</div><div className="score-table"><div className="score-row score-heading"><span>Rank</span><span>Player</span><span>Time</span><span>Map</span></div>{scores.map((entry, index) => <div className="score-row" key={entry.id}><strong>#{index + 1}</strong><span>{entry.displayName || shortAccount(entry.account)}{account && entry.account === account && " · You"}</span><b>{entry.durationTicks} tics</b><small>{entry.map}</small></div>)}</div></div>;
  if (view === "result" && result) return <div className="doom-app doom-result"><span className="doom-mark">DOOM</span><span className="doom-kicker">E1M1 COMPLETE · CANONICAL RESULT</span><h2>{result.durationTicks} tics</h2><div className="result-grid"><span>Map<b>{result.map}</b></span><span>Completion<b>{(result.durationTicks / 35).toFixed(2)}s</b></span></div><p>Result finalized by the PolkaVM Runner.</p><small className="mono">Replay-backed result {result.finalStateHash}</small><div className="doom-actions"><button className="doom-primary" onClick={() => void start()}><RotateCcw size={16} /> Run again</button><button onClick={() => void loadScores()}><Trophy size={16} /> View scores</button></div></div>;
  const label = status === "ready" ? "Available" : status === "running" ? "Running" : "Unavailable";
  return <div className="doom-app doom-home"><span className="doom-mark">DOOM</span><span className="doom-kicker">JAM COMPUTER · REAL POLKAVM RUNNER</span><h2>E1M1 · Skill 3 · {label}</h2><p>Play the fixed Alpha run in a long-lived PolkaVM instance. Video and input stay off-chain; only a completed replay-backed result is submitted.</p><button className="doom-primary" disabled={status !== "ready"} onClick={() => void start()}><Play size={17} /> START RUN</button><button className="doom-link" disabled={!runtime.doom.leaderboard} onClick={() => void loadScores()}><Trophy size={16} /> LEADERBOARD</button>{error && <p className="error-text">{error}</p>}<small className="coming-soon">Runtime status: {label} · 35 tics/sec</small></div>;
}
