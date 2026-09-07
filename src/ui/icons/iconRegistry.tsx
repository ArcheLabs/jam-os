import { AppsRegular, CodeFilled, CodeRegular, DeleteFilled, DeleteRegular, DesktopFilled, DesktopRegular, DocumentFilled, DocumentRegular, FolderOpenFilled, FolderOpenRegular, GamesFilled, GamesRegular, GlobeFilled, GlobeRegular, QuestionCircleFilled, QuestionCircleRegular, SettingsFilled, SettingsRegular, WindowConsoleFilled, WindowConsoleRegular } from "@fluentui/react-icons";
import type { JamIconDefinition } from "./types";
import { BrowserIcon } from "./artwork/BrowserIcon";
import { ComputerIcon } from "./artwork/ComputerIcon";
import { DoomIcon } from "./artwork/DoomIcon";
import { FilesIcon } from "./artwork/FilesIcon";
import { HelpIcon } from "./artwork/HelpIcon";
import { PlaygroundIcon } from "./artwork/PlaygroundIcon";
import { SettingsIcon } from "./artwork/SettingsIcon";
import { TerminalIcon } from "./artwork/TerminalIcon";
import { TrashIcon } from "./artwork/TrashIcon";

export const jamIconRegistry: Record<string, JamIconDefinition> = {
  computer: { id: "computer", artwork: ComputerIcon, glyphRegular: DesktopRegular, glyphFilled: DesktopFilled, shape: "object", dominantColor: "#459EFF" },
  files: { id: "files", artwork: FilesIcon, glyphRegular: FolderOpenRegular, glyphFilled: FolderOpenFilled, shape: "object", dominantColor: "#3B9EFF" },
  browser: { id: "browser", artwork: BrowserIcon, glyphRegular: GlobeRegular, glyphFilled: GlobeFilled, shape: "circle", dominantColor: "#557DFF" },
  terminal: { id: "terminal", artwork: TerminalIcon, glyphRegular: WindowConsoleRegular, glyphFilled: WindowConsoleFilled, shape: "squircle", dominantColor: "#243957" },
  playground: { id: "playground", artwork: PlaygroundIcon, glyphRegular: CodeRegular, glyphFilled: CodeFilled, shape: "object", dominantColor: "#6955DB" },
  settings: { id: "settings", artwork: SettingsIcon, glyphRegular: SettingsRegular, glyphFilled: SettingsFilled, shape: "freeform", dominantColor: "#8196A9" },
  doom: { id: "doom", artwork: DoomIcon, glyphRegular: GamesRegular, glyphFilled: GamesFilled, shape: "freeform", dominantColor: "#C64C72" },
  help: { id: "help", artwork: HelpIcon, glyphRegular: QuestionCircleRegular, glyphFilled: QuestionCircleFilled, shape: "circle", dominantColor: "#47D9D6" },
  trash: { id: "trash", artwork: TrashIcon, glyphRegular: DeleteRegular, glyphFilled: DeleteFilled, shape: "object", dominantColor: "#8299AD" },
};

export const getJamIconDefinition = (appId: string) => jamIconRegistry[appId] || null;

export const jamIconIds = Object.keys(jamIconRegistry);

export const fallbackAppGlyph = AppsRegular;

export const contentGlyphs = {
  folder: FolderOpenFilled,
  document: DocumentRegular,
  code: CodeRegular,
  site: GlobeRegular,
  service: DesktopRegular,
  unknown: DocumentFilled,
};
