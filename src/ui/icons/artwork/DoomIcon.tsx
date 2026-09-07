import { ArtworkSvg } from "./artworkUtils";
import type { JamArtworkProps } from "../types";

export function DoomIcon(props: JamArtworkProps) {
  return <ArtworkSvg {...props}>{(id) => <>
    <defs>
      <linearGradient id={`${id}-body`} x1="18" y1="28" x2="108" y2="99" gradientUnits="userSpaceOnUse"><stop stopColor="#EA7277" /><stop offset=".52" stopColor="#C64C72" /><stop offset="1" stopColor="#743D83" /></linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#170A1A" floodOpacity=".42" /></filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>
      <path d="M31 37c8-9 20-14 33-14s25 5 33 14l14 33c4 10-2 21-13 23l-18 3-16-12-16 12-18-3c-11-2-17-13-13-23l14-33Z" fill={`url(#${id}-body)`} />
      <path d="M34 43c7-7 17-10 30-10s23 3 30 10l-5 14H39l-5-14Z" fill="#F7C7C7" opacity=".15" />
      <path d="M37 62h17v7H37v-7Zm5-5h7v17h-7V57Z" fill="#F7C7C7" opacity=".92" />
      <circle cx="82" cy="62" r="5" fill="#F7C7C7" /><circle cx="94" cy="73" r="5" fill="#F7C7C7" />
      <path d="M60 83h8" stroke="#F7C7C7" strokeWidth="5" strokeLinecap="round" />
    </g>
  </>}</ArtworkSvg>;
}
