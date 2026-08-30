import { Pause, Play, RotateCcw, ShieldCheck, Square, UploadCloud } from "lucide-react";
import type { DoomCheckpoint, DoomRealtimeStatus, DoomState } from "../../runtime/types";

export function DoomHUD({ state, status, checkpoint, onPause, onCheckpoint, onFinish }: { state: DoomState | null; status: DoomRealtimeStatus; checkpoint: DoomCheckpoint | null; onPause: () => void; onCheckpoint: () => void; onFinish: () => void }) {
  const paused = status === "paused";
  return <>
    <div className="doom-hud doom-hud-live"><span>HEALTH <b>{state?.health ?? "—"}</b></span><span>AMMO <b>{state?.ammo ?? "—"}</b></span><span>SCORE <b>{(state?.score ?? 0).toLocaleString()}</b></span><span>TICK <b>{state?.tick ?? 0}</b></span><span>CONNECTION <b className={`doom-connection ${status}`}>{status.toUpperCase()}</b></span></div>
    <div className="doom-game-actions"><button type="button" onClick={onPause}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "Resume" : "Pause"}</button><button type="button" onClick={onCheckpoint} disabled={status === "checkpointing" || status === "closed"}><UploadCloud size={14} />{status === "checkpointing" ? "Checkpointing" : "Checkpoint"}</button><button type="button" onClick={onFinish}><Square size={13} /> End run</button></div>
    <div className="doom-checkpoint-line">{checkpoint ? <><ShieldCheck size={13} /> {checkpoint.verified ? "Verified" : "Local checkpoint"} · tick {checkpoint.tick} · {checkpoint.stateHash.slice(0, 14)}…</> : <><RotateCcw size={13} /> No checkpoint yet</>}</div>
  </>;
}
