import type { ReactNode } from "react";
export interface WindowInstance { id: string; appId: string; title: string; x: number; y: number; width: number; height: number; zIndex: number; minimized: boolean; maximized: boolean; args?: string; }
export interface DesktopAppDefinition { id: string; title: string; icon: ReactNode; defaultSize: { width: number; height: number }; minSize: { width: number; height: number }; singleton?: boolean; }
