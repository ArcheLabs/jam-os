import { ArtworkSvg } from "./artworkUtils";
import type { JamArtworkProps } from "../types";

export function PlaygroundIcon(props: JamArtworkProps) {
  return <ArtworkSvg {...props}>{(id) => <>
    <defs>
      <linearGradient id={`${id}-panel`} x1="18" y1="18" x2="104" y2="111" gradientUnits="userSpaceOnUse"><stop stopColor="#9A7DFF" /><stop offset=".52" stopColor="#6955DB" /><stop offset="1" stopColor="#3F347E" /></linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#0A0625" floodOpacity=".4" /></filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>
      <path d="M27 17h62c8 0 14 6 14 14v66c0 8-6 14-14 14H27c-8 0-14-6-14-14V31c0-8 6-14 14-14Z" fill={`url(#${id}-panel)`} />
      <path d="M27 17h62c8 0 14 6 14 14v9H13v-9c0-8 6-14 14-14Z" fill="#E7E3FF" opacity=".18" />
      <circle cx="27" cy="30" r="3" fill="#E7E3FF" opacity=".75" /><circle cx="37" cy="30" r="3" fill="#E7E3FF" opacity=".45" />
      <path d="m40 58-13 10 13 10M88 58l13 10-13 10M69 51 59 85" fill="none" stroke="#3CCFD6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="82" cy="91" r="7" fill="#E7E3FF" opacity=".72" /><circle cx="82" cy="91" r="2" fill="#6955DB" />
    </g>
  </>}</ArtworkSvg>;
}
