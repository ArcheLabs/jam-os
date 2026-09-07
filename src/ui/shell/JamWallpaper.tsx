export function JamWallpaper({ mode }: { mode: "boot" | "login" | "desktop" }) {
  return <div className={`jam-wallpaper jam-wallpaper-${mode}`} aria-hidden="true" />;
}
