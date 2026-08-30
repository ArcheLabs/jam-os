import { useEffect } from "react";
import type { DoomAction } from "../../runtime/types";

const keyActions: Record<string, DoomAction> = {
  w: "forward", ArrowUp: "forward", s: "backward", ArrowDown: "backward", a: "left", ArrowLeft: "left", d: "right", ArrowRight: "right", " ": "fire", e: "use", Tab: "weapon_next",
};

export function DoomControls({ onPress, onRelease, onPause, onMouseMove }: { onPress: (action: DoomAction) => void; onRelease: (action: DoomAction) => void; onPause: () => void; onMouseMove: (movementX: number) => void }) {
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onPause(); return; }
      const action = keyActions[event.key] || keyActions[event.key.toLowerCase()];
      if (!action) return;
      event.preventDefault();
      if (!event.repeat || action === "forward" || action === "backward" || action === "left" || action === "right") onPress(action);
    };
    const up = (event: KeyboardEvent) => { const action = keyActions[event.key] || keyActions[event.key.toLowerCase()]; if (action) { event.preventDefault(); onRelease(action); } };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [onPause, onPress, onRelease]);
  return <div className="doom-controls" aria-label="DOOM controls"><span>WASD / ARROWS move</span><span>SPACE fire</span><span>E use</span><span>TAB weapon</span><span>ESC pause</span><span>Mouse fire / turn</span><button type="button" className="doom-mouse-capture" onPointerMove={(event) => { if (event.buttons) onMouseMove(event.movementX); }} /></div>;
}
