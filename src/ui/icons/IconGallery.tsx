import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { CheckmarkCircle24Regular, DismissCircle24Regular } from "@fluentui/react-icons";
import { JamLogo } from "../brand/JamLogo";
import { JamWallpaper } from "../shell/JamWallpaper";
import { systemApps } from "../../os/appRegistry";
import { JamAppIcon } from "./JamAppIcon";
import { JamFileIcon } from "./JamFileIcon";
import { JamSystemGlyph } from "./JamSystemGlyph";
import { jamIconIds } from "./iconRegistry";

const artworkSizes = [96, 72, 54, 48, 32];
const glyphSizes = [24, 18];

export function IconGallery() {
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [grayscale, setGrayscale] = useState(false);
  const names = useMemo(() => new Map(systemApps.map((app) => [app.id, app.name])), []);
  return <main className={`icon-gallery-shell ${labelsVisible ? "labels-visible" : "labels-hidden"} ${grayscale ? "is-grayscale" : ""}`}>
    <JamWallpaper mode="desktop" />
    <div className="icon-gallery-content">
      <header className="icon-gallery-header"><div className="icon-gallery-brand"><JamLogo variant="symbol" size={34} /><div><strong>JAM OS Icon System</strong><small>V1 · deterministic visual review</small></div></div><div className="icon-gallery-actions"><button onClick={() => setLabelsVisible((value) => !value)}>{labelsVisible ? <CheckmarkCircle24Regular /> : <DismissCircle24Regular />} Labels</button><button className={grayscale ? "is-selected" : ""} onClick={() => setGrayscale((value) => !value)}>Grayscale</button></div></header>
      <section className="icon-gallery-panel icon-gallery-panel-dark"><div className="icon-gallery-section-heading"><div><span>APP ARTWORK</span><h1>Objects, not glyphs</h1></div><small>96 · 72 · 54 · 48 · 32 px</small></div><div className="icon-gallery-artwork-grid">{jamIconIds.map((id) => <article className="icon-gallery-app" key={id}><div className="icon-gallery-app-name">{names.get(id) || id}</div><div className="icon-gallery-scale-row">{artworkSizes.map((size) => <div className="icon-gallery-scale" style={{ "--gallery-size": `${size}px` } as CSSProperties} key={size}><JamAppIcon appId={id} context="about" size={size} /><small>{size}</small></div>)}</div><div className="icon-gallery-glyph-row">{glyphSizes.map((size) => <div className="icon-gallery-glyph" key={size}><JamAppIcon appId={id} context="window" size={size} /><small>{size}</small></div>)}</div></article>)}</div></section>
      <section className="icon-gallery-panel icon-gallery-panel-light"><div className="icon-gallery-section-heading"><div><span>SYSTEM AND CONTENT</span><h2>Fluent Regular / Filled</h2></div><small>small sizes stay functional</small></div><div className="icon-gallery-system-grid">{jamIconIds.map((id) => <div className="icon-gallery-system-item" key={id}><JamSystemGlyph appId={id} context="menu" /><span>{names.get(id) || id}</span><JamSystemGlyph appId={id} context="menu" active /></div>)}</div><div className="icon-gallery-files"><JamFileIcon entry={{ type: "directory", path: "/Documents", mime: "inode/directory" }} size="large" /><JamFileIcon entry={{ type: "file", path: "/index.html", mime: "text/html" }} size="large" /><JamFileIcon entry={{ type: "file", path: "/app.ts", mime: "text/typescript" }} size="large" /><JamFileIcon entry={{ type: "file", path: "/archive.zip", mime: "application/zip" }} size="large" /><JamFileIcon entry={{ type: "file", path: "/image.png", mime: "image/png" }} size="large" /></div></section>
    </div>
  </main>;
}
