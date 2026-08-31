import { useEffect, useState } from "react";
import { ShieldAlert, Trophy, Play, RotateCcw } from "lucide-react";
import type { JamOsRuntimeV2 } from "../../runtime/types";
import type { DoomLeaderboardEntry, DoomResult, DoomRuntimeStatus, DoomSession } from "../../runtime/types";
import { DoomGame } from "./DoomGame";

type View = "home" | "leaderboard" | "running" | "result";
const ACTIVE_SESSION_KEY = "jam-os:doom:active-session";
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
  if (view === "leaderboard") return <div className="doom-app doom-leaderboard"><div className="doom-header"><span className="doom-mark small">DOOM LAB</span><button onClick={() => setView("home")}>Back</button></div><div className="doom-tabs"><button className="active">SCORES</button><button onClick={() => void loadScores(true)}>MY SCORE</button></div><div className="doom-demo-label"><ShieldAlert size={14} /> Deterministic MiniJAM Service scores · Alpha simulation</div><div className="score-table"><div className="score-row score-heading"><span>Rank</span><span>Player</span><span>Score</span><span>Map</span></div>{scores.map((entry, index) => <div className="score-row" key={entry.id}><strong>#{index + 1}</strong><span>{entry.displayName || shortAccount(entry.account)}{account && entry.account === account && " · You"}</span><b>{entry.score.toLocaleString()}</b><small>{entry.map}</small></div>)}</div></div>;
  if (view === "result" && result) return <div className="doom-app doom-result"><span className="doom-mark">DOOM LAB</span><span className="doom-kicker">SIMULATION COMPLETE · DETERMINISTIC RESULT</span><h2>{result.score.toLocaleString()}</h2><div className="result-grid"><span>Map<b>{result.map}</b></span><span>Kills<b>{result.kills}</b></span><span>Ticks<b>{result.durationTicks}</b></span></div><p>Verified result · state hash anchored by {result.execution?.serviceId ? "MiniJAM" : "Preview"}</p><small className="mono">State {result.finalStateHash}</small>{import.meta.env.DEV && result.execution && <small className="mono">Work {result.execution.workId} · Receipt {result.execution.receiptHash || "pending"}</small>}<div className="doom-actions"><button className="doom-primary" onClick={() => void start()}><RotateCcw size={16} /> Run again</button><button onClick={() => void loadScores()}><Trophy size={16} /> View scores</button></div></div>;
  const label = status === "ready" ? "Available" : status === "running" ? "Running" : "Unavailable";
  return <div className="doom-app doom-home"><span className="doom-mark">DOOM LAB</span><span className="doom-kicker">JAM COMPUTER GAME ROOM · ALPHA SIMULATION</span><h2>Deterministic arena · {label}</h2><p>A DOOM-inspired MiniJAM protocol simulation with Canvas frames, realtime input, pause/resume, and deterministic checkpoints. It does not embed the original DOOM engine, WAD files, maps, or game assets.</p><button className="doom-primary" disabled={status !== "ready"} onClick={() => void start()}><Play size={17} /> START SIMULATION</button><button className="doom-link" disabled={!runtime.doom.leaderboard} onClick={() => void loadScores()}><Trophy size={16} /> SCORES</button>{error && <p className="error-text">{error}</p>}<small className="coming-soon">Runtime status: {label} · 30 FPS</small></div>;
}
