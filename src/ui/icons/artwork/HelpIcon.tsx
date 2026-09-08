import { ArtworkSvg } from "./artworkUtils";
import type { JamArtworkProps } from "../types";

export function HelpIcon(props: JamArtworkProps) {
  return <ArtworkSvg {...props}>{(id) => <>
    <defs>
      <radialGradient id={`${id}-bubble`} cx="34" cy="26" r="82" gradientUnits="userSpaceOnUse"><stop stopColor="#B7FFFF" /><stop offset=".48" stopColor="#47D9D6" /><stop offset="1" stopColor="#2586B7" /></radialGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#061A28" floodOpacity=".32" /></filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>
      <path d="M64 15c28 0 49 18 49 43 0 23-18 42-43 44l-18 11 1-12c-22-5-38-21-38-43 0-25 21-43 49-43Z" fill={`url(#${id}-bubble)`} />
      <path d="M29 45c10-14 27-22 47-21 10 1 19 4 26 10-20-2-38 2-54 12-7 4-13 9-18 16-3-5-3-11-1-17Z" fill="#E9FFFF" opacity=".26" />
      <path d="M57 53c1-7 6-11 13-11 8 0 13 5 13 11 0 5-3 8-8 11-4 2-5 4-5 8M70 86h.1" fill="none" stroke="#F2FFFF" strokeWidth="6" strokeLinecap="round" />
    </g>
  </>}</ArtworkSvg>;
}
