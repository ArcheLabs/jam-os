import type { WindowInstance } from "./types";
export function focusWindow(windows: WindowInstance[], id: string, zIndex: number) { return windows.map((window) => window.id === id ? { ...window, minimized: false, zIndex } : window); }
