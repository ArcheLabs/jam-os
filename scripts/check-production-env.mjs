const mode = String(process.env.VITE_JAM_MODE || "").trim().toLowerCase();

if (mode !== "live") {
  console.log("PRODUCTION_ENV=NOT_APPLICABLE (VITE_JAM_MODE is not live)");
  process.exit(0);
}

const required = [
  "VITE_MINIJAM_NODE_RPC_URL",
  "VITE_MINIJAM_WORK_RPC_URL",
  "VITE_MINIJAM_DEPLOYMENT_RPC_URL",
  "VITE_MINIJAM_GENESIS_HASH",
  "VITE_COMPUTER_SERVICE_CODE_HASH",
];
const forbiddenDoom = Object.keys(process.env).filter((key) => /^VITE_DOOM/i.test(key) && process.env[key]);
const errors = [];

for (const name of required) if (!String(process.env[name] || "").trim()) errors.push(`${name} is required when VITE_JAM_MODE=live`);

const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "example.com", "www.example.com"]);
for (const name of required.slice(0, 3)) {
  const value = String(process.env[name] || "").trim();
  if (!value) continue;
  let url;
  try { url = new URL(value); } catch { errors.push(`${name} is not a valid URL`); continue; }
  if (!['http:', 'https:'].includes(url.protocol)) errors.push(`${name} must use the HTTP JSON-RPC transport (http or https)`);
  if (blockedHosts.has(url.hostname.toLowerCase()) || url.hostname.endsWith(".example.com")) errors.push(`${name} cannot point at a local or placeholder host`);
  if (url.username || url.password) errors.push(`${name} must not embed credentials in the URL`);
}

const hashPattern = /^0x[0-9a-f]{64}$/i;
for (const name of ["VITE_MINIJAM_GENESIS_HASH", "VITE_COMPUTER_SERVICE_CODE_HASH"]) {
  const value = String(process.env[name] || "").trim();
  if (value && !hashPattern.test(value)) errors.push(`${name} must be a 32-byte 0x-prefixed hash`);
}
if (forbiddenDoom.length) errors.push(`DOOM environment variables are not part of the Stage-1 production contract: ${forbiddenDoom.join(", ")}`);

if (errors.length) {
  console.error("PRODUCTION_ENV=FAIL");
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("PRODUCTION_ENV=PASS");
