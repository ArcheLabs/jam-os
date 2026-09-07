import { ArtworkSvg } from "./artworkUtils";
import type { JamArtworkProps } from "../types";

export function TrashIcon(props: JamArtworkProps) {
  return <ArtworkSvg {...props}>{(id) => <>
    <defs>
      <linearGradient id={`${id}-bin`} x1="31" y1="33" x2="98" y2="110" gradientUnits="userSpaceOnUse"><stop stopColor="#D8E8F1" /><stop offset=".48" stopColor="#8299AD" /><stop offset="1" stopColor="#435A75" /></linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#07121F" floodOpacity=".36" /></filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>
      <path d="M30 32h68l-5 75c-1 7-6 11-13 11H48c-7 0-12-4-13-11l-5-75Z" fill={`url(#${id}-bin)`} />
      <path d="M24 27h80v12H24z" fill="#DDECF4" opacity=".84" /><rect x="48" y="18" width="32" height="9" rx="4.5" fill="#8299AD" />
      <path d="M48 48v51M64 48v51M80 48v51" stroke="#D8E8F1" strokeOpacity=".38" strokeWidth="4" />
      <path d="M35 40h58" stroke="#435A75" strokeOpacity=".48" strokeWidth="3" />
    </g>
  </>}</ArtworkSvg>;
}
