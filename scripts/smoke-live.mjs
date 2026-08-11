const base = (process.env.VITE_PLAYGROUND_API_URL || process.env.VITE_MINIJAM_API_URL || "").replace(/\/$/, "");
const jns = process.env.VITE_JNS_SERVICE_ID;
const computer = process.env.VITE_SMOKE_COMPUTER_SERVICE_ID;
if (!base) throw new Error("Set VITE_PLAYGROUND_API_URL or VITE_MINIJAM_API_URL before running smoke:live");
if (!jns || !computer) throw new Error("Set VITE_JNS_SERVICE_ID and VITE_SMOKE_COMPUTER_SERVICE_ID before running smoke:live");
async function get(path) { const response = await fetch(`${base}${path}`); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`${path}: ${response.status} ${body.error || body.message || "request failed"}`); return body; }
const config = await get("/config");
const jnsView = await get(`/services/${encodeURIComponent(jns)}`);
const computerView = await get(`/services/${encodeURIComponent(computer)}`);
console.log(JSON.stringify({ network: config.name || config.networkName || "MiniJAM", jnsService: jnsView.serviceId, computerService: computerView.serviceId, controller: computerView.controller, mutation: "not attempted" }, null, 2));
