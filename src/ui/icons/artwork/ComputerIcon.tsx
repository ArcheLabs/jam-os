import { ArtworkSvg } from "./artworkUtils";
import type { JamArtworkProps } from "../types";

export function ComputerIcon(props: JamArtworkProps) {
  return <ArtworkSvg {...props}>{(id) => <>
    <defs>
      <linearGradient id={`${id}-screen`} x1="24" y1="18" x2="96" y2="92" gradientUnits="userSpaceOnUse"><stop stopColor="#6DE4EB" /><stop offset=".5" stopColor="#459EFF" /><stop offset="1" stopColor="#5267E8" /></linearGradient>
      <linearGradient id={`${id}-body`} x1="38" y1="88" x2="91" y2="112" gradientUnits="userSpaceOnUse"><stop stopColor="#31557E" /><stop offset="1" stopColor="#132944" /></linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#07152C" floodOpacity=".35" /></filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>
      <rect x="18" y="16" width="92" height="70" rx="16" fill="#193A63" />
      <rect x="23" y="21" width="82" height="60" rx="11" fill={`url(#${id}-screen)`} />
      <path d="M25 29c19-10 45-11 77 2v12c-28-8-53-8-77 2V29Z" fill="#C8FFFF" opacity=".18" />
      <circle cx="64" cy="51" r="13" fill="#172C68" opacity=".76" />
      <circle cx="64" cy="51" r="10" fill="#4ED9E4" />
      <path d="M56 57c4-1 7-4 9-7 2-3 3-5 6-6-1 8-5 14-11 16-2 1-3 0-4-3Z" fill="#E6FFFF" opacity=".85" />
      <path d="M43 86h42l8 22H35l8-22Z" fill={`url(#${id}-body)`} />
      <rect x="49" y="92" width="30" height="4" rx="2" fill="#6DE4EB" opacity=".55" />
      <rect x="40" y="106" width="48" height="5" rx="2.5" fill="#0E2039" />
    </g>
  </>}</ArtworkSvg>;
}
