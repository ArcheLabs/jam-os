export function JamWallpaper({ mode }: { mode: "boot" | "login" | "desktop" }) {
  return <div className={`jam-wallpaper jam-wallpaper-${mode}`} aria-hidden="true">
    <span className="jam-wallpaper-field jam-wallpaper-field-violet" />
    <span className="jam-wallpaper-field jam-wallpaper-field-cyan" />
    <span className="jam-wallpaper-field jam-wallpaper-field-blue" />
  </div>;
}
