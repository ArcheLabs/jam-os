import type { ComponentType } from "react";
import { fallbackAppGlyph, getJamIconDefinition } from "./iconRegistry";
import type { AppIconContext, JamGlyphProps } from "./types";

const glyphSizes: Record<Extract<AppIconContext, "window" | "menu">, number> = { window: 18, menu: 19 };
type FallbackIcon = ComponentType<{ size?: number; strokeWidth?: number }>;

export function JamSystemGlyph({ appId, context = "window", active = false, fallbackIcon, size }: { appId: string; context?: Extract<AppIconContext, "window" | "menu">; active?: boolean; fallbackIcon?: FallbackIcon; size?: number }) {
  const definition = getJamIconDefinition(appId);
  const Glyph = active && definition?.glyphFilled ? definition.glyphFilled : definition?.glyphRegular;
  const FallbackIcon = fallbackIcon;
  const FallbackGlyph = fallbackAppGlyph;
  const iconSize = size || glyphSizes[context];
  return <span className={`jam-system-glyph jam-system-glyph-${context} ${active ? "is-active" : ""}`} aria-hidden="true">{Glyph ? <Glyph fontSize={iconSize} primaryFill="currentColor" /> : FallbackIcon ? <FallbackIcon size={iconSize} strokeWidth={1.8} /> : <FallbackGlyph fontSize={iconSize} primaryFill="currentColor" />}</span>;
}
