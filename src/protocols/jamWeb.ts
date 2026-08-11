import type { JamSiteManifest } from "../jam/types";
export function isPublishablePath(path: string) { return /\.(html?|css|txt|md|png|jpe?g|gif|webp|svg)$/i.test(path); }
export function manifestIndex(manifest: JamSiteManifest | null) { return manifest?.index || "/index.html"; }
