import { ArtworkSvg } from "./artworkUtils";
import type { JamArtworkProps } from "../types";

export function BrowserIcon(props: JamArtworkProps) {
  return <ArtworkSvg {...props}>{(id) => <>
    <defs>
      <radialGradient id={`${id}-orb`} cx="30" cy="24" r="96" gradientUnits="userSpaceOnUse"><stop stopColor="#B8C2FF" /><stop offset=".36" stopColor="#557DFF" /><stop offset=".72" stopColor="#2C91E8" /><stop offset="1" stopColor="#36D7D4" /></radialGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#07152C" floodOpacity=".3" /></filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>
      <circle cx="64" cy="64" r="49" fill={`url(#${id}-orb)`} />
      <path d="M22 51c20-12 42-13 66-5 9 3 16 7 22 13-3-19-19-35-38-41-22-6-43 3-50 33Z" fill="#EAFBFF" opacity=".18" />
      <ellipse cx="64" cy="64" rx="25" ry="48" fill="none" stroke="#E7F7FF" strokeOpacity=".52" strokeWidth="2" />
      <path d="M16 64h96M25 42c23 9 55 9 78 0M25 86c23-9 55-9 78 0" fill="none" stroke="#E7F7FF" strokeOpacity=".42" strokeWidth="2" />
      <path d="M85 25c13 7 22 18 26 32-8-3-15-7-21-13-5-5-7-12-5-19Z" fill="#8D7BFF" opacity=".75" />
      <circle cx="47" cy="42" r="5" fill="#FFFFFF" opacity=".6" />
    </g>
  </>}</ArtworkSvg>;
}
