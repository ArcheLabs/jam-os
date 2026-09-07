import { CodeFilled, DeleteFilled, DesktopFilled, FolderOpenFilled, GlobeFilled, GamesFilled, QuestionCircleFilled, SettingsFilled, WindowConsoleFilled } from "@fluentui/react-icons";
import type { ComponentType } from "react";

type FallbackIcon = ComponentType<{ size?: number; strokeWidth?: number }>;
type IconSize = "desktop" | "dock" | "menu";

const appGlyphs = {
  computer: DesktopFilled,
  files: FolderOpenFilled,
  browser: GlobeFilled,
  terminal: WindowConsoleFilled,
  playground: CodeFilled,
  settings: SettingsFilled,
  doom: GamesFilled,
  help: QuestionCircleFilled,
  trash: DeleteFilled,
};

export function JamAppIcon({ appId, fallbackIcon: FallbackIcon, size = "desktop" }: { appId: string; fallbackIcon?: FallbackIcon; size?: IconSize }) {
  const Glyph = appGlyphs[appId as keyof typeof appGlyphs];
  const iconSize = size === "desktop" ? 38 : size === "dock" ? 25 : 18;
  return <span className={`jam-app-icon jam-app-icon-${appId} jam-app-icon-${size}`} aria-hidden="true"><span className="jam-app-icon-shine" />{Glyph ? <Glyph fontSize={iconSize} primaryFill="currentColor" /> : FallbackIcon ? <FallbackIcon size={iconSize} strokeWidth={1.8} /> : <QuestionCircleFilled fontSize={iconSize} primaryFill="currentColor" />}</span>;
}
