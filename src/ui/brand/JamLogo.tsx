type JamLogoProps = {
  size?: number;
  variant?: "full" | "symbol" | "monochrome" | "status";
  className?: string;
};

export function JamLogo({ size = 34, variant = "full", className = "" }: JamLogoProps) {
  const symbolSize = variant === "status" ? 18 : size;
  const label = variant === "full" ? "JAM OS" : "JAM";
  return <span className={`jam-logo jam-logo-${variant} ${className}`.trim()} aria-label={label} role="img">
    <svg width={symbolSize} height={symbolSize} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="jamOrbGradient" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b6a8ff" />
          <stop offset=".48" stopColor="#6b8dff" />
          <stop offset="1" stopColor="#35d7df" />
        </linearGradient>
        <linearGradient id="jamWaveGradient" x1="14" y1="45" x2="50" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dffcff" />
          <stop offset="1" stopColor="#80b7ff" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#jamOrbGradient)" />
      <path d="M15 45c8-2 15-6 20-12 5-5 7-11 14-15 2-1 3-2 5-2-2 12-9 25-20 31-6 3-13 3-19-2Z" fill="url(#jamWaveGradient)" opacity=".92" />
      <path d="M16 18c7 6 16 8 24 4 5-2 8-5 10-8-9-7-22-7-31-1-2 1-3 3-3 5Z" fill="#3e36c9" opacity=".8" />
      <circle cx="24" cy="19" r="2.5" fill="#fff" opacity=".7" />
    </svg>
    {variant === "full" && <span className="jam-logo-wordmark">JAM OS</span>}
  </span>;
}
