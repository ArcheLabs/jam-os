import type { CSSProperties } from "react";

const generatedPalette = ["#3B9EFF", "#6955DB", "#2586B7", "#C64C72", "#516579"];

function stablePaletteIndex(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0) % generatedPalette.length;
}

export function JamGeneratedAppIcon({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "JA";
  const color = generatedPalette[stablePaletteIndex(name)];
  return <span className="jam-generated-app-icon" style={{ "--jam-generated-color": color, width: size, height: size } as CSSProperties} aria-hidden="true"><span>{initials}</span></span>;
}
