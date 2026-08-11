import type { ReactNode } from "react";
export function DesktopIcon({ icon, title, onOpen }: { icon: ReactNode; title: string; onOpen: () => void }) { return <button className="desktop-icon" onDoubleClick={onOpen} onClick={onOpen}><span className="icon-glyph">{icon}</span><span>{title}</span></button>; }
