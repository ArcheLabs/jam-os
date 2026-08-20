import { useCallback, useEffect, useRef, useState } from "react";
import type { JamOsRuntimeV2 } from "../../runtime/types";
import type { DoomCheckpoint, DoomFrame, DoomResult, DoomRealtimeSession, DoomRealtimeStatus, DoomSession, DoomState } from "../../runtime/types";
import { DoomCanvas } from "./DoomCanvas";
import { DoomControls } from "./DoomControls";
import { DoomHUD } from "./DoomHUD";

export function DoomGame({ runtime, session, onFinish }: { runtime: JamOsRuntimeV2; session: DoomSession; onFinish: (result: DoomResult) => void }) {
  const [realtime, setRealtime] = useState<DoomRealtimeSession | null>(null);
  const [frame, setFrame] = useState<DoomFrame | null>(null);
  const [state, setState] = useState<DoomState | null>(null);
  const [checkpoint, setCheckpoint] = useState<DoomCheckpoint | null>(null);
  const [status, setStatus] = useState<DoomRealtimeStatus>("connecting");
  const [error, setError] = useState("");
  const held = useRef(new Set<string>());
  const oneShot = useRef(new Set<string>());
  const currentTick = useRef(0);
  const refreshState = useCallback(async () => { try { setState(await runtime.doom.getState(session.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to read DOOM state"); } }, [runtime, session.id]);

  useEffect(() => {
    let alive = true;
    let connected: DoomRealtimeSession | null = null;
    void runtime.doom.connectRealtime(session.id).then((next) => {
      if (!alive) { void next.close(); return; }
      connected = next; setRealtime(next); setStatus(next.status());
      const unsubscribe = next.subscribeFrame((nextFrame) => {
        currentTick.current = nextFrame.tick;
        setFrame(nextFrame);
        const actions = [...held.current, ...oneShot.current] as import("../../runtime/types").DoomAction[];
        oneShot.current.clear();
        if (actions.length) { try { next.sendInput({ tick: nextFrame.tick + 1, actions }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to send DOOM input"); } }
      });
      void refreshState();
      return () => unsubscribe();
    }).catch((cause) => { if (alive) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Unable to connect to DOOM runtime"); } });
    const stateTimer = window.setInterval(() => void refreshState(), 250);
    const visibility = () => { if (document.hidden) void connected?.pause(); else if (connected?.status() === "paused") void connected.resume(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { alive = false; window.clearInterval(stateTimer); document.removeEventListener("visibilitychange", visibility); if (connected) void connected.close(); };
  }, [refreshState, runtime, session.id]);

  const togglePause = useCallback(() => { if (!realtime) return; const operation = realtime.status() === "paused" ? realtime.resume() : realtime.pause(); void operation.then(() => setStatus(realtime.status())).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to change pause state")); }, [realtime]);
  const press = useCallback((action: import("../../runtime/types").DoomAction) => { if (["forward", "backward", "left", "right"].includes(action)) held.current.add(action); else oneShot.current.add(action); }, []);
  const release = useCallback((action: import("../../runtime/types").DoomAction) => { held.current.delete(action); }, []);
  const mouseMove = useCallback((movementX: number) => { if (movementX > 4) oneShot.current.add("right"); if (movementX < -4) oneShot.current.add("left"); }, []);
  const checkpointNow = useCallback(() => { if (!realtime) return; setStatus("checkpointing"); void realtime.checkpoint().then((next) => { setCheckpoint(next); setStatus(realtime.status()); }).catch((cause) => { setStatus("error"); setError(cause instanceof Error ? cause.message : "Checkpoint failed"); }); }, [realtime]);
  const finish = useCallback(() => { if (!realtime) return; void realtime.close().then(() => runtime.doom.finish(session.id)).then(onFinish).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to finish DOOM session")); }, [onFinish, realtime, runtime.doom, session.id]);

  return <div className="doom-app doom-running"><div className="doom-header"><span className="doom-mark small">DOOM</span><span className="doom-score">{(state?.score ?? 0).toLocaleString()} <small>· tick {currentTick.current}</small></span></div><div className="doom-canvas-shell"><DoomCanvas frame={frame} onPointerDown={() => press("fire")} onPointerMove={mouseMove} />{status === "paused" && <div className="doom-paused">PAUSED</div>}{status === "connecting" && <div className="doom-paused">CONNECTING…</div>}</div><DoomHUD state={state} status={status} checkpoint={checkpoint} onPause={togglePause} onCheckpoint={checkpointNow} onFinish={finish} /><DoomControls onPress={press} onRelease={release} onPause={togglePause} onMouseMove={mouseMove} /><div className="doom-runtime-meta">{session.runtimeVersion} · ruleset {session.rulesetVersion} · session {session.id}</div>{error && <p className="error-text">{error}</p>}</div>;
}
