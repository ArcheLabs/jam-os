import type { ComponentType, CSSProperties } from "react";
import { getJamIconDefinition } from "./iconRegistry";
import { JamSystemGlyph } from "./JamSystemGlyph";
import { JamGeneratedAppIcon } from "./JamGeneratedAppIcon";
import type { AppIconContext } from "./types";
import type { JamGlyphProps } from "./types";
import type { ComponentType as FallbackIconComponent } from "react";

const artworkContexts: AppIconContext[] = ["desktop", "dock", "launcher", "about"];
const artworkSizes: Record<Extract<AppIconContext, "desktop" | "dock" | "launcher" | "about">, number> = { desktop: 72, dock: 54, launcher: 48, about: 92 };

type FallbackIcon = FallbackIconComponent<{ size?: number; strokeWidth?: number }>;

export function JamAppIcon({ appId, context = "desktop", fallbackIcon, size }: { appId: string; context?: AppIconContext; fallbackIcon?: FallbackIcon; size?: number }) {
  const definition = getJamIconDefinition(appId);
  if (!definition && artworkContexts.includes(context)) {
    const artworkContext = context as Extract<AppIconContext, "desktop" | "dock" | "launcher" | "about">;
    return <span className={`jam-app-artwork jam-app-artwork-generated jam-app-artwork-${artworkContext}`}><JamGeneratedAppIcon name={appId} size={size || artworkSizes[artworkContext]} /><span className="jam-app-artwork-forced"><JamSystemGlyph appId={appId} context="window" fallbackIcon={fallbackIcon} size={18} /></span></span>;
  }
  if (!definition || !artworkContexts.includes(context)) return <JamSystemGlyph appId={appId} context={context === "menu" ? "menu" : "window"} fallbackIcon={fallbackIcon} size={size} />;
  const Artwork = definition.artwork;
  const artworkContext = context as Extract<AppIconContext, "desktop" | "dock" | "launcher" | "about">;
  const artworkSize = size || artworkSizes[artworkContext];
  return <span className={`jam-app-artwork jam-app-artwork-${appId} jam-app-artwork-${context}`} style={{ "--jam-artwork-color": definition.dominantColor, "--jam-artwork-size": `${artworkSize}px` } as CSSProperties}><Artwork size="100%" /><span className="jam-app-artwork-forced"><JamSystemGlyph appId={appId} context="window" size={18} /></span></span>;
}
