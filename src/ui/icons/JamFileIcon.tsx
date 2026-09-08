import { Archive24Regular, DocumentCode16Regular, DocumentCss24Regular, DocumentText24Regular, FolderOpen24Filled, Globe24Regular, Image24Regular, Server24Regular } from "@fluentui/react-icons";
import type { FileEntry } from "../../runtime/types";

type FileIconSize = "row" | "sidebar" | "large";

function fileIconFor(entry: Pick<FileEntry, "type" | "path" | "mime">) {
  if (entry.type === "directory") return FolderOpen24Filled;
  const path = entry.path.toLowerCase();
  if (entry.mime?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(path)) return Image24Regular;
  if (entry.mime?.includes("html") || /\.(html?|css)$/.test(path)) return entry.path.endsWith(".css") ? DocumentCss24Regular : Globe24Regular;
  if (entry.mime?.includes("javascript") || /\.(tsx?|jsx?|json)$/.test(path)) return DocumentCode16Regular;
  if (entry.mime?.includes("zip") || /\.(zip|tar|gz|tgz|rar)$/.test(path)) return Archive24Regular;
  if (entry.mime?.includes("server") || /service|site/i.test(path)) return Server24Regular;
  return DocumentText24Regular;
}

export function JamFileIcon({ entry, size = "row" }: { entry: Pick<FileEntry, "type" | "path" | "mime">; size?: FileIconSize }) {
  const Glyph = fileIconFor(entry);
  return <span className={`jam-file-icon jam-file-icon-${size} jam-file-icon-${entry.type}`} aria-hidden="true"><Glyph /></span>;
}
