import { describe, expect, it } from "vitest";
import { closeWindow, createWindowManagerState, focusWindow, maximizeWindow, minimizeWindow, openWindow, restoreWindow } from "../../src/os/window/windowStore";

const input = { id: "terminal-1", appId: "terminal", title: "Terminal", x: 10, y: 10, width: 600, height: 400 };

describe("JAM OS window manager", () => {
  it("opens, focuses, minimizes, restores, maximizes and closes windows", () => {
    let state = openWindow(createWindowManagerState(), input);
    const firstZ = state.windows[0].zIndex;
    state = openWindow(state, { ...input, id: "files-1", appId: "files", title: "Files" });
    state = focusWindow(state, "terminal-1");
    expect(state.windows.find((window) => window.id === "terminal-1")?.zIndex).toBeGreaterThan(firstZ);
    state = minimizeWindow(state, "terminal-1");
    expect(state.windows.find((window) => window.id === "terminal-1")?.minimized).toBe(true);
    state = restoreWindow(state, "terminal-1");
    expect(state.windows.find((window) => window.id === "terminal-1")?.minimized).toBe(false);
    state = maximizeWindow(state, "terminal-1");
    expect(state.windows.find((window) => window.id === "terminal-1")?.maximized).toBe(true);
    state = closeWindow(state, "terminal-1");
    expect(state.windows.map((window) => window.appId)).toEqual(["files"]);
  });

  it("restores a singleton instead of opening a duplicate", () => {
    let state = openWindow(createWindowManagerState(), input, true);
    state = minimizeWindow(state, "terminal-1");
    state = openWindow(state, { ...input, id: "terminal-2" }, true);
    expect(state.windows).toHaveLength(1);
    expect(state.windows[0].id).toBe("terminal-1");
    expect(state.windows[0].minimized).toBe(false);
  });
});
