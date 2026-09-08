import { ArtworkSvg } from "./artworkUtils";
import type { JamArtworkProps } from "../types";

export function FilesIcon(props: JamArtworkProps) {
  return <ArtworkSvg {...props}>{(id) => <>
    <defs>
      <linearGradient id={`${id}-back`} x1="20" y1="26" x2="104" y2="102" gradientUnits="userSpaceOnUse"><stop stopColor="#BEEFFF" /><stop offset=".42" stopColor="#69D8FF" /><stop offset="1" stopColor="#2673DF" /></linearGradient>
      <linearGradient id={`${id}-front`} x1="21" y1="52" x2="101" y2="107" gradientUnits="userSpaceOnUse"><stop stopColor="#69D8FF" /><stop offset=".56" stopColor="#3B9EFF" /><stop offset="1" stopColor="#2673DF" /></linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#07152C" floodOpacity=".32" /></filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>
      <path d="M15 34c0-9 7-16 16-16h25l10 11h31c9 0 16 7 16 16v42c0 12-10 22-22 22H37c-12 0-22-10-22-22V34Z" fill={`url(#${id}-back)`} />
      <path d="M18 48c0-7 6-13 13-13h76c7 0 12 6 11 13l-5 47c-1 7-7 12-14 12H32c-7 0-13-5-14-12l-5-47h5Z" fill={`url(#${id}-front)`} />
      <path d="M22 51h92" stroke="#E9FCFF" strokeOpacity=".42" strokeWidth="2" />
      <path d="M59 63h24c3 0 5 2 5 5v24c0 3-2 5-5 5H59c-3 0-5-2-5-5V68c0-3 2-5 5-5Z" fill="#DFFBFF" opacity=".48" />
      <path d="M60 70h22M60 77h22M60 84h14" stroke="#2673DF" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" />
    </g>
  </>}</ArtworkSvg>;
}
