import { useEffect, useState } from "react";
import type { JamOsRuntimeV2 } from "../../runtime/types";

export function Settings({ runtime, serviceId }: { runtime: JamOsRuntimeV2; serviceId: string | null }) {
  const [network, setNetwork] = useState<{ name: string; endpoint: string; healthy: boolean } | null>(null);
  const [account, setAccount] = useState<{ address: string } | null>(null);
  const [message, setMessage] = useState("");
  const [shareName, setShareName] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  useEffect(() => {
    void runtime.network.getInfo().then(setNetwork).catch((error) => setMessage(error.message));
    void runtime.account.current().then(setAccount);
  }, [runtime]);
  const createShareLink = async () => {
    setShareMessage("");
    const name = shareName.trim().replace(/^@/, "").toLowerCase();
    if (!name) { setShareMessage("Claim a JAM name to create a shareable Computer URL."); return; }
    if (!serviceId) { setShareMessage("Computer Service is not ready."); return; }
    try {
      const resolved = await runtime.names.resolve(name);
      if (resolved.serviceId !== serviceId) { setShareMessage("That JAM name is bound to a different Computer."); return; }
      const link = `${window.location.origin}/@${name}`;
      await navigator.clipboard?.writeText(link);
      setShareMessage(`${link} copied`);
    } catch { setShareMessage("Name not found. Bind the name to this Computer first."); }
  };
  return <div className="settings-app"><div className="settings-card"><div className="settings-label">Network</div><strong>{network?.name || "Checking…"}</strong><span className={network?.healthy ? "health-text" : "error-text"}>{network?.healthy ? "● Connected" : message || "Offline"}</span><small>{network?.endpoint}</small></div><div className="settings-card"><div className="settings-label">Account</div><strong>{account?.address || "Not connected"}</strong><small>Wallet connection is handled during startup.</small></div><div className="settings-card"><div className="settings-label">Computer Service</div><strong className="mono">{serviceId || "Not configured"}</strong>{serviceId && <button onClick={() => navigator.clipboard?.writeText(serviceId)}>Copy service ID</button>}</div><div className="settings-card"><div className="settings-label">Sharing</div><strong>Share Computer</strong><div className="share-row"><input value={shareName} onChange={(event) => setShareName(event.target.value)} placeholder="@alice" aria-label="JAM name" /><button onClick={() => void createShareLink()}>Copy link</button></div>{shareMessage && <small>{shareMessage}</small>}</div><div className="settings-card"><div className="settings-label">JNS Service</div><strong className="mono">{runtime.mode === "mock" ? "mock JNS" : "Awaiting canonical deployment"}</strong></div><div className="settings-card"><div className="settings-label">Runtime</div><strong>{runtime.mode.toUpperCase()}</strong><span>Backend: None</span></div>{message && <p className="notice">{message}</p>}<p className="settings-note">Private keys never enter JAM FS or local storage. Window layout is canonical only when saved through Computer Service.</p></div>;
}
