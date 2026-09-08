import { ArtworkSvg } from "./artworkUtils";
import type { JamArtworkProps } from "../types";

export function TerminalIcon(props: JamArtworkProps) {
  return <ArtworkSvg {...props}>{(id) => <>
    <defs>
      <linearGradient id={`${id}-frame`} x1="24" y1="22" x2="99" y2="108" gradientUnits="userSpaceOnUse"><stop stopColor="#243957" /><stop offset=".58" stopColor="#101B2C" /><stop offset="1" stopColor="#08111F" /></linearGradient>
      <linearGradient id={`${id}-screen`} x1="33" y1="35" x2="91" y2="94" gradientUnits="userSpaceOnUse"><stop stopColor="#1B304D" /><stop offset="1" stopColor="#0A1527" /></linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#02060D" floodOpacity=".5" /></filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>
      <rect x="16" y="19" width="96" height="87" rx="16" fill={`url(#${id}-frame)`} />
      <rect x="25" y="29" width="78" height="65" rx="9" fill={`url(#${id}-screen)`} />
      <circle cx="29" cy="24" r="3" fill="#FF8A86" /><circle cx="39" cy="24" r="3" fill="#F8D77A" /><circle cx="49" cy="24" r="3" fill="#7DE2B0" />
      <path d="m39 53 11 10-11 10M58 77h27" fill="none" stroke="#43D9D2" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M91 44v9" stroke="#DFFBFF" strokeOpacity=".35" strokeWidth="2" />
      <rect x="45" y="102" width="38" height="5" rx="2.5" fill="#2B4668" />
    </g>
  </>}</ArtworkSvg>;
}
