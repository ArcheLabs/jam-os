import type { WindowInstance } from "../../desktop/types";

export interface WindowManagerState { windows: WindowInstance[]; nextZ: number; }

export function createWindowManagerState(): WindowManagerState { return { windows: [], nextZ: 10 }; }

export function openWindow(state: WindowManagerState, input: Omit<WindowInstance, "zIndex" | "minimized" | "maximized"> & Partial<Pick<WindowInstance, "minimized" | "maximized">>, singleton = false): WindowManagerState {
  const existing = singleton ? state.windows.find((window) => window.appId === input.appId) : undefined;
  const nextZ = state.nextZ + 1;
  if (existing) return { nextZ, windows: state.windows.map((window) => window.id === existing.id ? { ...window, minimized: false, zIndex: nextZ } : window) };
  return { nextZ, windows: [...state.windows, { ...input, zIndex: nextZ, minimized: input.minimized ?? false, maximized: input.maximized ?? false }] };
}

export function focusWindow(state: WindowManagerState, id: string): WindowManagerState { const nextZ = state.nextZ + 1; return { nextZ, windows: state.windows.map((window) => window.id === id ? { ...window, zIndex: nextZ, minimized: false } : window) }; }
export function minimizeWindow(state: WindowManagerState, id: string): WindowManagerState { return { ...state, windows: state.windows.map((window) => window.id === id ? { ...window, minimized: true } : window) }; }
export function restoreWindow(state: WindowManagerState, id: string): WindowManagerState { return focusWindow({ ...state, windows: state.windows.map((window) => window.id === id ? { ...window, minimized: false, maximized: false } : window) }, id); }
export function maximizeWindow(state: WindowManagerState, id: string): WindowManagerState { return { ...state, windows: state.windows.map((window) => window.id === id ? { ...window, maximized: !window.maximized, minimized: false } : window) }; }
export function closeWindow(state: WindowManagerState, id: string): WindowManagerState { return { ...state, windows: state.windows.filter((window) => window.id !== id) }; }
