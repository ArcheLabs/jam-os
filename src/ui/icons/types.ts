import type { ComponentType } from "react";

export type AppIconContext = "desktop" | "dock" | "launcher" | "window" | "menu" | "about";

export interface JamArtworkProps {
  size?: number | string;
  className?: string;
  title?: string;
}

export interface JamGlyphProps {
  fontSize?: number | string;
  primaryFill?: string;
  className?: string;
  title?: string;
}

export interface JamIconDefinition {
  id: string;
  artwork: ComponentType<JamArtworkProps>;
  glyphRegular: ComponentType<JamGlyphProps>;
  glyphFilled?: ComponentType<JamGlyphProps>;
  shape: "circle" | "squircle" | "object" | "freeform";
  dominantColor: string;
}
