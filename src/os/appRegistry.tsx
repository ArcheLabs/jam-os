import { lazy } from "react";
import type { ComponentType } from "react";
import { Code2, Folder, Gamepad2, Globe2, HelpCircle, Monitor, Settings, SquareTerminal, Trash2 } from "lucide-react";
import { Browser } from "../apps/browser/Browser";
import { MyComputer } from "../apps/computer/MyComputer";
import { Files } from "../apps/files/Files";
import { Doom } from "../apps/doom/Doom";
import { Playground } from "../apps/playground/Playground";
import { Settings as SettingsApp } from "../apps/settings/Settings";
import type { JamOsRuntimeV2 } from "../runtime";

export interface AppProps {
  runtime: JamOsRuntimeV2;
  serviceId: string | null;
  openApp: (id: string, args?: string) => void;
}

export interface AppManifest {
  id: string;
  name: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  defaultWidth: number;
  defaultHeight: number;
  singleton?: boolean;
  component: ComponentType<AppProps>;
  desktop?: boolean;
}

export const systemApps: AppManifest[] = [
  // Keep xterm out of the registry's eager import graph so unit tests and lightweight tooling can inspect manifests without a DOM.
  { id: "terminal", name: "Terminal", icon: SquareTerminal, defaultWidth: 760, defaultHeight: 460, singleton: true, component: lazy(() => import("../apps/terminal/TerminalApp").then((module) => ({ default: module.TerminalApp }))) as unknown as ComponentType<AppProps> },
  { id: "computer", name: "JAM Computer", icon: Monitor, defaultWidth: 720, defaultHeight: 500, singleton: true, component: ({ runtime, serviceId, openApp }) => <MyComputer runtime={runtime} serviceId={serviceId} openEditor={(path) => openApp("playground", path)} /> },
  { id: "files", name: "Files", icon: Folder, defaultWidth: 720, defaultHeight: 500, singleton: true, component: ({ runtime, serviceId, openApp }) => <Files runtime={runtime} serviceId={serviceId} openApp={openApp} /> },
  { id: "browser", name: "Browser", icon: Globe2, defaultWidth: 900, defaultHeight: 620, component: ({ runtime, serviceId }) => <Browser runtime={runtime} serviceId={serviceId} /> },
  { id: "playground", name: "Playground", icon: Code2, defaultWidth: 1000, defaultHeight: 700, component: ({ runtime, serviceId }) => <Playground runtime={runtime} serviceId={serviceId} /> },
  { id: "doom", name: "DOOM", icon: Gamepad2, defaultWidth: 760, defaultHeight: 600, component: ({ runtime, openApp }) => <Doom runtime={runtime} openPlayground={() => openApp("playground")} /> },
  { id: "settings", name: "Settings", icon: Settings, defaultWidth: 520, defaultHeight: 560, singleton: true, component: ({ runtime, serviceId }) => <SettingsApp runtime={runtime} serviceId={serviceId} /> },
  { id: "help", name: "Help", icon: HelpCircle, defaultWidth: 560, defaultHeight: 420, singleton: true, component: () => <div className="help-app"><h2>JAM Computer Help</h2><p>Double-click an app to open it. Drag title bars to move windows, and use the taskbar to restore them.</p><p>Preview mode uses a local mock runtime. Live mode keeps wallet, network and service access behind JamOsRuntimeV2.</p></div> },
  { id: "trash", name: "Trash", icon: Trash2, defaultWidth: 460, defaultHeight: 320, singleton: true, component: () => <div className="empty-state"><h2>Trash is empty</h2><p>Deleted files will appear here in a future release.</p></div>, desktop: true },
];

export function getAppManifest(id: string) { return systemApps.find((app) => app.id === id) || systemApps[0]; }
