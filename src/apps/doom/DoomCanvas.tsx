import { useEffect, useRef } from "react";
import type { DoomFrame } from "../../runtime/types";

export function DoomCanvas({ frame, onPointerDown, onPointerMove }: { frame: DoomFrame | null; onPointerDown: () => void; onPointerMove: (movementX: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.putImageData(new ImageData(new Uint8ClampedArray(frame.pixels), frame.width, frame.height), 0, 0);
  }, [frame]);
  return <canvas ref={canvasRef} className="doom-canvas" tabIndex={0} aria-label="DOOM game framebuffer" onPointerDown={(event) => { event.currentTarget.focus(); onPointerDown(); }} onPointerMove={(event) => { if (event.buttons) onPointerMove(event.movementX); }} />;
}
