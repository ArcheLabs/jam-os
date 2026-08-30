const base = (process.env.VITE_MINIJAM_API_URL || process.env.VITE_PLAYGROUND_API_URL || "").replace(/\/$/, "");
const computer = process.env.VITE_SMOKE_COMPUTER_SERVICE_ID;
const doom = process.env.VITE_SMOKE_DOOM_SERVICE_ID;
if (!base) throw new Error("Set VITE_MINIJAM_API_URL or VITE_PLAYGROUND_API_URL before running smoke:live");
if (!computer) throw new Error("Set VITE_SMOKE_COMPUTER_SERVICE_ID before running smoke:live");
async function get(path) { const response = await fetch(`${base}${path}`); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`${path}: ${response.status} ${body.error || body.message || "request failed"}`); return body; }
const config = await get("/config");
const computerView = await get(`/services/${encodeURIComponent(computer)}`);
const doomView = doom ? await get(`/services/${encodeURIComponent(doom)}`) : null;
console.log(JSON.stringify({ network: config.name || config.networkName || "MiniJAM", jnsService: "disabled pending canonical deployment", computerService: computerView.serviceId, doomService: doomView?.serviceId || null, controller: computerView.controller, mutation: "not attempted" }, null, 2));
