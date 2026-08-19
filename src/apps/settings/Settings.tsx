import { useEffect, useState } from "react";
import type { Runtime } from "../../runtime";

export function Settings({ runtime, serviceId }: { runtime: Runtime; serviceId: string | null }) {
  const [network, setNetwork] = useState<{ name: string; endpoint: string; healthy: boolean } | null>(null);
  const [account, setAccount] = useState<{ address: string } | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void runtime.network.getInfo().then(setNetwork).catch((error) => setMessage(error.message));
    void runtime.account.current().then(setAccount);
  }, [runtime]);
  return <div className="settings-app"><div className="settings-card"><div className="settings-label">Network</div><strong>{network?.name || "Checking…"}</strong><span className={network?.healthy ? "health-text" : "error-text"}>{network?.healthy ? "● Connected" : message || "Offline"}</span><small>{network?.endpoint}</small></div><div className="settings-card"><div className="settings-label">Account</div><strong>{account?.address || "Not connected"}</strong><small>Wallet connection is handled during startup.</small></div><div className="settings-card"><div className="settings-label">Computer Service</div><strong className="mono">{serviceId || "Not configured"}</strong>{serviceId && <button onClick={() => navigator.clipboard?.writeText(serviceId)}>Copy service ID</button>}</div><div className="settings-card"><div className="settings-label">JNS Service</div><strong className="mono">{import.meta.env.VITE_JNS_SERVICE_ID || "mock JNS"}</strong></div><div className="settings-card"><div className="settings-label">Runtime</div><strong>{runtime.mode.toUpperCase()}</strong><span>Backend: None</span></div>{message && <p className="notice">{message}</p>}<p className="settings-note">Private keys never enter JAM FS or local storage. Window layout is local UI state.</p></div>;
}
