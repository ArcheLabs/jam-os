import { ArtworkSvg } from "./artworkUtils";
import type { JamArtworkProps } from "../types";

export function SettingsIcon(props: JamArtworkProps) {
  return <ArtworkSvg {...props}>{(id) => <>
    <defs>
      <linearGradient id={`${id}-steel`} x1="27" y1="22" x2="101" y2="108" gradientUnits="userSpaceOnUse"><stop stopColor="#C2D0DA" /><stop offset=".38" stopColor="#8196A9" /><stop offset="1" stopColor="#516579" /></linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#07121F" floodOpacity=".38" /></filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>
      <path d="m59 13 10 1 4 12 9 5 11-5 7 8-6 10 3 10 12 5-1 11-12 3-5 9 5 11-8 7-10-6-10 4-4 12-11 1-4-12-10-4-10 6-8-7 5-11-5-9-12-3-1-11 12-5 3-10-6-10 7-8 11 5 9-5 4-12Z" fill={`url(#${id}-steel)`} />
      <path d="m59 13 10 1 4 12 9 5 11-5 7 8-6 10 3 10 12 5-1 11-12 3-5 9 5 11-8 7-10-6-10 4-4 12-11 1-4-12-10-4-10 6-8-7 5-11-5-9-12-3-1-11 12-5 3-10-6-10 7-8 11 5 9-5 4-12Z" fill="#E8F6FF" opacity=".18" />
      <circle cx="64" cy="64" r="27" fill="#23374D" />
      <circle cx="64" cy="64" r="14" fill="#0F2033" stroke="#B8D0DE" strokeOpacity=".55" strokeWidth="3" />
      <circle cx="77" cy="44" r="4" fill="#6DE4EB" />
    </g>
  </>}</ArtworkSvg>;
}
