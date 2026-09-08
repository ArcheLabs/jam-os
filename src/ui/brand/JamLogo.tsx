import { useId } from "react";

type JamLogoProps = {
  size?: number;
  variant?: "full" | "symbol" | "monochrome" | "status";
  className?: string;
};

export function JamLogo({ size = 34, variant = "full", className = "" }: JamLogoProps) {
  const id = useId().replace(/:/g, "");
  const symbolSize = variant === "status" ? 18 : size;
  const label = variant === "full" ? "JAM OS" : "JAM";
  return <span className={`jam-logo jam-logo-${variant} ${className}`.trim()} aria-label={label} role="img">
    <svg width={symbolSize} height={symbolSize} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-orb`} cx="0" cy="0" r="1" gradientTransform="translate(20 15) rotate(49) scale(55)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d7d2ff" />
          <stop offset=".22" stopColor="#968cff" />
          <stop offset=".58" stopColor="#526fe8" />
          <stop offset="1" stopColor="#1ebccc" />
        </radialGradient>
        <linearGradient id={`${id}-wave`} x1="15" y1="48" x2="51" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1ffff" />
          <stop offset=".48" stopColor="#79e8f2" />
          <stop offset="1" stopColor="#79a7ff" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="43" y1="10" x2="23" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#050b2e" stopOpacity="0" />
          <stop offset="1" stopColor="#07122f" stopOpacity=".46" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0" cy="0" r="1" gradientTransform="translate(21 16) rotate(45) scale(18)">
          <stop stopColor="white" stopOpacity=".68" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill={`url(#${id}-orb)`} stroke="rgba(225,247,255,.58)" strokeWidth=".7" />
      <circle cx="32" cy="32" r="27.6" fill={`url(#${id}-shade)`} />
      <path d="M14.5 44.5c8.6-1.4 16.1-5.7 21.2-11.6 4.8-5.5 7.4-11.7 14.3-15.6 1.4-.8 2.8-1.5 4.2-1.8-1.6 12.7-9.2 25.4-20.4 31.3-6.3 3.3-13.6 2.7-19.3-2.3Z" fill={`url(#${id}-wave)`} opacity=".96" />
      <path d="M15.8 18.2c7.1 5.8 15.8 7.6 24 3.8 4.7-2.2 8-5.1 10.2-8.1-9.3-7-22-7.1-31.1-1.1-2.1 1.4-3.2 3.2-3.1 5.4Z" fill="#4434c6" opacity=".78" />
      <circle cx="22" cy="16" r="16" fill={`url(#${id}-shine)`} />
      <ellipse cx="23.5" cy="17.2" rx="3.1" ry="2.2" fill="#fff" opacity=".72" transform="rotate(-25 23.5 17.2)" />
    </svg>
    {variant === "full" && <span className="jam-logo-wordmark">JAM OS</span>}
  </span>;
}
