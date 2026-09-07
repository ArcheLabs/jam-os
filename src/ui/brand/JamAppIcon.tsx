import { Code, Desktop, FolderOpen, GameController, GearSix, GlobeHemisphereWest, Question, TerminalWindow, Trash } from "@phosphor-icons/react";
import type { ComponentType } from "react";

type FallbackIcon = ComponentType<{ size?: number; strokeWidth?: number }>;
type IconSize = "desktop" | "dock" | "menu";

const appGlyphs = {
  computer: Desktop,
  files: FolderOpen,
  browser: GlobeHemisphereWest,
  terminal: TerminalWindow,
  playground: Code,
  settings: GearSix,
  doom: GameController,
  help: Question,
  trash: Trash,
};

export function JamAppIcon({ appId, fallbackIcon: FallbackIcon, size = "desktop" }: { appId: string; fallbackIcon?: FallbackIcon; size?: IconSize }) {
  const Glyph = appGlyphs[appId as keyof typeof appGlyphs] || FallbackIcon || Question;
  return <span className={`jam-app-icon jam-app-icon-${appId} jam-app-icon-${size}`} aria-hidden="true"><span className="jam-app-icon-shine" /><Glyph size={size === "desktop" ? 38 : size === "dock" ? 24 : 18} weight="duotone" /></span>;
}
