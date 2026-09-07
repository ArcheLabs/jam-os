import type { ReactNode } from "react";
import { useId } from "react";
import type { JamArtworkProps } from "../types";

export function ArtworkSvg({ size = "100%", className, title, children }: JamArtworkProps & { children: (id: string) => ReactNode }) {
  const id = useId().replace(/:/g, "");
  return <svg className={className} width={size} height={size} viewBox="0 0 128 128" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
    {title && <title>{title}</title>}
    {children(id)}
  </svg>;
}
