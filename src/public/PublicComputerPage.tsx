import { useEffect, useState } from "react";
import { ExternalLink, Globe2, LockKeyhole } from "lucide-react";
import { JamScriptComputerBackend } from "../jam/computerBackend";
import type { JamOsRuntimeV2 } from "../runtime/types";

function text(value: unknown): string {
  if (!(value instanceof Uint8Array)) return "";
  return new TextDecoder().decode(value).replaceAll("\u0000", "").trim();
}
function root(value: unknown): string | null {
  if (!(value instanceof Uint8Array) || value.length !== 32 || value.every((byte) => byte === 0)) return null;
  return `0x${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function PublicComputerPage({ name, runtime }: { name: string; runtime: JamOsRuntimeV2 }) {
  const [profile, setProfile] = useState<{ displayName: string; bio: string; avatarRoot?: string; avatarSize?: number } | null>(null);
  const [appearance, setAppearance] = useState<{ theme: string; accent: string; wallpaperRoot?: string; wallpaperSize?: number } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const record = await runtime.names.resolve(name);
        if (!active) return;
        setServiceId(record.serviceId);
        if (runtime.mode === "mock") {
          setProfile({ displayName: name, bio: "Public JAM Computer" });
          setAppearance({ theme: "system", accent: "blue" });
          return;
        }
        const backend = new JamScriptComputerBackend(record.serviceId, runtime.account);
        const [rawProfile, rawAppearance] = await Promise.all([
          backend.query("getProfile", new Uint8Array([0])),
          backend.query("getAppearance", new Uint8Array([0])),
        ]);
        if (!rawProfile || typeof rawProfile !== "object" || rawProfile instanceof Uint8Array || Array.isArray(rawProfile)) throw new Error("Public Computer profile is unavailable");
        if (!active) return;
        const profileRecord = rawProfile as Record<string, unknown>;
        const avatarRoot = root(profileRecord.avatarRoot);
        const avatarSize = typeof profileRecord.avatarSize === "number" ? profileRecord.avatarSize : 0;
        setProfile({ displayName: text(profileRecord.displayName) || name, bio: text(profileRecord.bio), avatarRoot: avatarRoot || undefined, avatarSize });
        if (rawAppearance && typeof rawAppearance === "object" && !(rawAppearance instanceof Uint8Array) && !Array.isArray(rawAppearance)) {
          const appearanceRecord = rawAppearance as Record<string, unknown>;
          const wallpaperRoot = root(appearanceRecord.wallpaperRoot);
          const wallpaperSize = typeof appearanceRecord.wallpaperSize === "number" ? appearanceRecord.wallpaperSize : 0;
          setAppearance({ theme: text(appearanceRecord.theme) || "system", accent: text(appearanceRecord.accent) || "blue", wallpaperRoot: wallpaperRoot || undefined, wallpaperSize });
        }
        if (runtime.content && avatarRoot && avatarSize > 0) {
          const bytes = await runtime.content.get({ version: 1, root: avatarRoot, size: avatarSize });
          if (active) setAvatarUrl(URL.createObjectURL(new Blob([bytes as unknown as BlobPart])));
        }
        if (runtime.content && rawAppearance && typeof rawAppearance === "object" && !(rawAppearance instanceof Uint8Array) && !Array.isArray(rawAppearance)) {
          const appearanceRecord = rawAppearance as Record<string, unknown>;
          const wallpaperRoot = root(appearanceRecord.wallpaperRoot);
          const wallpaperSize = typeof appearanceRecord.wallpaperSize === "number" ? appearanceRecord.wallpaperSize : 0;
          if (wallpaperRoot && wallpaperSize > 0) {
            const bytes = await runtime.content.get({ version: 1, root: wallpaperRoot, size: wallpaperSize });
            if (active) setWallpaperUrl(URL.createObjectURL(new Blob([bytes as unknown as BlobPart])));
          }
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "This JAM Computer is unavailable");
      }
    })();
    return () => { active = false; };
  }, [name, runtime]);

  if (error) return <main className="public-computer-page"><section className="public-error"><Globe2 size={28} /><h1>JAM Computer unavailable</h1><p>{error}</p><a href={`jam://${name}/`}>Try the published site <ExternalLink size={14} /></a></section></main>;
  return <main className="public-computer-page" data-theme={appearance?.theme || "system"} data-accent={appearance?.accent || "blue"} style={wallpaperUrl ? { backgroundImage: `linear-gradient(rgba(7, 17, 31, .76), rgba(7, 17, 31, .92)), url(${wallpaperUrl})` } : undefined}>
    <header className="public-computer-header"><div className="public-brand"><span>◆</span><strong>JAM COMPUTER</strong></div><span className="public-readonly"><LockKeyhole size={13} /> READ-ONLY GUEST VIEW</span></header>
    <section className="public-desktop-card"><div className="public-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : (profile?.displayName || name).slice(0, 1).toUpperCase()}</div><div className="public-profile-copy"><p className="public-eyebrow">PUBLIC COMPUTER</p><h1>{profile?.displayName || "Loading…"}</h1><p className="public-handle">@{name}</p><p className="public-bio">{profile?.bio || "Loading public profile…"}</p></div><div className="public-service-meta">{serviceId && <small>Computer Service #{serviceId}</small>}<a href={`jam://${name}/`}>Open website <ExternalLink size={13} /></a></div></section>
    <section className="public-guest-note"><Globe2 size={18} /><div><strong>Guest desktop</strong><p>Only public profile and published content are visible. Private files and owner controls stay on the JAM Computer.</p></div></section>
  </main>;
}
