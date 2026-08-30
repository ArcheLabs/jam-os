import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveBrowserUrl, type BrowserResolvedDocument } from "./protocolRouter";
import { canonicalizeUrl } from "../../protocols/jamUri";
import type { JamOsRuntimeV2 } from "../../runtime/types";
import { isJamBridgeMessage } from "./bridge";

export function Browser({ runtime, serviceId }: { runtime: JamOsRuntimeV2; serviceId: string | null }) {
  const fs = useMemo(() => serviceId ? runtime.fs.mount(serviceId) : null, [runtime, serviceId]);
  const [address, setAddress] = useState("jam://alice"); const [history, setHistory] = useState<string[]>([]); const [cursor, setCursor] = useState(-1); const [doc, setDoc] = useState<BrowserResolvedDocument | null>(null); const [error, setError] = useState(""); const frameRef = useRef<HTMLIFrameElement>(null);
  const navigate = useCallback(async (raw: string, push = true) => { setError(""); try { const url = canonicalizeUrl(raw); const resolved = await resolveBrowserUrl(url, { localFs: fs, names: runtime.names, siteForService: (targetServiceId) => runtime.fs.mount(targetServiceId) }); setAddress(url); setDoc(resolved); if (push) { setHistory((old) => [...old.slice(0, cursor + 1), url]); setCursor((old) => old + 1); } } catch (e) { setError(e instanceof Error ? e.message : "Unable to load page"); } }, [cursor, fs, runtime.names, runtime.fs]);
  useEffect(() => { void navigate(address); }, []); // intentional first-page load
  useEffect(() => { const receive = (event: MessageEvent) => { if (event.source !== frameRef.current?.contentWindow || doc?.scheme !== "jam" || !isJamBridgeMessage(event.data)) return; if (event.data.type === "jam:navigate" && event.data.href) void navigate(event.data.href); }; window.addEventListener("message", receive); return () => window.removeEventListener("message", receive); }, [doc?.scheme, navigate]);
  const goBack = () => { if (cursor > 0) { const next = cursor - 1; setCursor(next); void navigate(history[next], false); } };
  const goForward = () => { if (cursor + 1 < history.length) { const next = cursor + 1; setCursor(next); void navigate(history[next], false); } };
  const title = doc?.title || "JAM Browser";
  return <div className="browser-app"><div className="browser-toolbar"><button onClick={goBack} disabled={cursor <= 0}>←</button><button onClick={goForward} disabled={cursor + 1 >= history.length}>→</button><button onClick={() => void navigate(address, false)}>↻</button><form onSubmit={(e) => { e.preventDefault(); void navigate(address); }}><input value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Address" /></form><span className={`scheme-badge scheme-${doc?.scheme || "about"}`}>{(doc?.scheme || "about").toUpperCase()}</span></div><div className="browser-meta">{doc?.jam?.serviceId && <span>Service #{doc.jam.serviceId}</span>}<span>{title}</span></div>{error ? <div className="browser-error"><h3>Unable to load this address</h3><p>{error}</p>{/^https?:/.test(address) && <button onClick={() => window.open(address, "_blank", "noopener,noreferrer")}>Open in system browser</button>}</div> : doc?.mode === "remote-frame" ? <iframe ref={frameRef} title={title} src={doc.frameUrl} /> : <iframe ref={frameRef} title={title} sandbox="allow-scripts" srcDoc={doc?.srcdoc} />}</div>;
}
