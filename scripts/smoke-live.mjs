import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] || "read";
const nodeUrl = String(process.env.VITE_MINIJAM_NODE_RPC_URL || "").replace(/\/$/, "");
const workUrl = String(process.env.VITE_MINIJAM_WORK_RPC_URL || "").replace(/\/$/, "");
const deploymentUrl = String(process.env.VITE_MINIJAM_DEPLOYMENT_RPC_URL || "").replace(/\/$/, "");
const serviceId = String(process.env.VITE_SMOKE_COMPUTER_SERVICE_ID || "");
const expectedCodeHash = String(process.env.VITE_COMPUTER_SERVICE_CODE_HASH || "");
let rpcId = 1;

function fail(code, message, details = {}) {
  console.error(JSON.stringify({ smoke: mode, result: "FAIL", failure: code, message, ...details }, null, 2));
  process.exit(1);
}

function requireValue(value, name) { if (!value) fail("CONFIGURATION_FAILED", `${name} is required`); return value; }

async function rpc(endpoint, method, params = []) {
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) throw new Error(body.error?.message || `HTTP ${response.status}`);
    return body.result;
  } catch (error) {
    throw new Error(`${method}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function decodeServiceInfo(encoded) {
  if (typeof encoded !== "string") throw new Error("finalized ServiceInfo was not hex");
  const bytes = Buffer.from(encoded.replace(/^0x/, ""), "hex");
  if (!bytes.length) throw new Error("finalized ServiceInfo is empty");
  const compactMode = bytes[0] & 3;
  let length;
  let offset;
  if (compactMode === 0) { length = bytes[0] >>> 2; offset = 1; }
  else if (compactMode === 1) { length = ((bytes[1] << 8) | bytes[0]) >>> 2; offset = 2; }
  else if (compactMode === 2) { length = (bytes[1] | (bytes[2] << 8) | (bytes[3] << 16)) >>> 2; offset = 4; }
  else throw new Error("large finalized ServiceInfo values are not supported by this smoke");
  if (offset + length !== bytes.length || length < 33) throw new Error("invalid finalized ServiceInfo length");
  return { codeHash: `0x${bytes.subarray(offset + 1, offset + 33).toString("hex")}`, codeLength: Number(bytes.readBigUInt64LE(offset + 33 + 16)) };
}

async function probe(endpoint, label) {
  requireValue(endpoint, `VITE_MINIJAM_${label.toUpperCase()}_RPC_URL`);
  try { await rpc(endpoint, "chain_getHeader", []); return "PASS"; }
  catch (error) { fail(`${label.toUpperCase()}_RPC_UNAVAILABLE`, `${label} RPC is unavailable`, { detail: error.message }); }
}

async function readSmoke() {
  requireValue(serviceId, "VITE_SMOKE_COMPUTER_SERVICE_ID");
  requireValue(nodeUrl, "VITE_MINIJAM_NODE_RPC_URL");
  requireValue(expectedCodeHash, "VITE_COMPUTER_SERVICE_CODE_HASH");
  const [node, work, deployment] = await Promise.all([probe(nodeUrl, "node"), probe(workUrl, "work"), probe(deploymentUrl, "deployment")]);
  const context = await rpc(nodeUrl, "minijam_getFinalizedContext").catch((error) => fail("NODE_RPC_UNAVAILABLE", "Node RPC did not return a finalized context", { detail: error.message }));
  const encoded = await rpc(nodeUrl, "minijam_getServiceInfoAt", [context.blockHash, Number(serviceId)]).catch((error) => fail("SERVICE_READ_FAILED", "Computer Service could not be read at finalized state", { detail: error.message }));
  if (!encoded) fail("SERVICE_NOT_FOUND", `Computer Service ${serviceId} does not exist at finalized state`);
  const service = decodeServiceInfo(encoded);
  if (service.codeHash.toLowerCase() !== expectedCodeHash.toLowerCase()) fail("STATE_MISMATCH", "Finalized Computer Service code hash does not match the promoted artifact", { expectedCodeHash, actualCodeHash: service.codeHash });
  console.log(JSON.stringify({ smoke: "read", result: "PASS", network: process.env.VITE_MINIJAM_NETWORK_NAME || "MiniJAM", nodeRpc: node, workRpc: work, deploymentRpc: deployment, serviceId, codeHash: service.codeHash, codeLength: service.codeLength, finalizedBlock: context.blockHash }, null, 2));
}

async function mutationSmoke() {
  requireValue(serviceId, "VITE_SMOKE_COMPUTER_SERVICE_ID");
  requireValue(expectedCodeHash, "VITE_COMPUTER_SERVICE_CODE_HASH");
  requireValue(process.env.VITE_MINIJAM_GENESIS_HASH, "VITE_MINIJAM_GENESIS_HASH");
  const publicKey = requireValue(process.env.SMOKE_ACCOUNT_PUBLIC_KEY, "SMOKE_ACCOUNT_PUBLIC_KEY");
  const signerCommand = requireValue(process.env.SMOKE_SIGNER_COMMAND, "SMOKE_SIGNER_COMMAND");
  const { JamScriptClient, FetchRpcTransport, parseHex, toHex } = await import("@jamscript/minijam-client");
  const { blake2AsU8a } = await import("@polkadot/util-crypto");
  const abi = JSON.parse(fs.readFileSync(path.join(root, "services/computer/abi/service.abi.json"), "utf8"));
  const build = JSON.parse(fs.readFileSync(path.join(root, "artifacts/computer/stage1/scriptc/build.json"), "utf8"));
  const deployment = { genesisHash: process.env.VITE_MINIJAM_GENESIS_HASH, serviceKey: build.serviceKey, serviceId: Number(serviceId), codeHash: expectedCodeHash, abiVersion: 1, abi: { ...abi, abiVersion: abi.abi_version, languageVersion: abi.language_version } };
  const signer = {
    publicKey: parseHex(publicKey, 32),
    signRaw: async (message) => {
      const result = spawnSync(signerCommand, [toHex(message)], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      if (result.status !== 0) throw new Error(result.stderr.trim() || `signer exited with ${result.status}`);
      return parseHex(result.stdout.trim(), 64);
    },
  };
  const client = new JamScriptClient(deployment, new FetchRpcTransport(nodeUrl));
  const encode = (value) => new TextEncoder().encode(value);
  const key = new Uint8Array([0]);
  const smokeDir = "/home/user/.release-smoke";
  const smokePath = `${smokeDir}/${process.env.SMOKE_RUN_ID || `${Date.now()}-${Math.random().toString(16).slice(2)}`}.txt`;
  const content = `jam-computer-release-smoke:${smokePath}`;
  const contentRoot = blake2AsU8a(new TextEncoder().encode(content), 256);
  const contentBytes = new TextEncoder().encode(content);
  const now = Math.floor(Date.now() / 1000);
  const results = [];
  const submit = async (action, input) => {
    let sent;
    try { sent = await client.submitAction(action, input, signer); }
    catch (error) { fail("SUBMISSION_FAILED", `${action} submission failed`, { detail: error.message }); }
    let completed;
    try { completed = await client.waitForAction(sent.packageHash, sent.actionHash, { intervalMs: 1_500, timeoutMs: 120_000 }); }
    catch (error) { fail(error.message.includes("timed out") ? "TRACKING_TIMEOUT" : "WORK_FAILED", `${action} Work did not finalize successfully`, { operationId: sent.packageHash, detail: error.message }); }
    if (completed.actionReceipt.status !== "applied") fail("WORK_FAILED", `${action} action was not applied`, { operationId: sent.packageHash, workId: completed.workId, executionReceipt: completed.executionReceipt, errorCode: completed.actionReceipt.errorCode });
    const result = { action, operationId: sent.packageHash, workId: completed.workId, executionReceipt: completed.executionReceipt };
    results.push(result);
    return result;
  };
  await submit("mkdir", { key, path: encode(smokeDir), parent: encode("/home/user"), updatedAt: now, parentEntries: encode(".release-smoke") });
  const write = await submit("writeFile", { key, path: encode(smokePath), parent: encode(smokeDir), mime: encode("text/plain"), size: contentBytes.length, contentRoot, updatedAt: now, parentEntries: encode(smokePath.slice(smokeDir.length + 1)) });
  let node;
  try { node = (await client.queryLatest("getNodeMetadata", encode(smokePath))).value; }
  catch (error) { fail("STATE_NOT_FINALIZED", "Finalized state could not be read after writeFile", { operationId: write.operationId, detail: error.message }); }
  if (!node || node.removed || node.size !== contentBytes.length || !(node.contentRoot instanceof Uint8Array) || Buffer.from(node.contentRoot).toString("hex") !== Buffer.from(contentRoot).toString("hex")) fail("STATE_MISMATCH", "Finalized node metadata does not match the release mutation", { path: smokePath, operationId: write.operationId });
  const parentIndex = (await client.queryLatest("getDirectoryIndex", encode(smokeDir))).value;
  const entries = parentIndex?.entries instanceof Uint8Array ? new TextDecoder().decode(parentIndex.entries).split("\n").filter(Boolean).filter((entry) => entry !== path.basename(smokePath)).join("\n") : "";
  await submit("removeNode", { key, path: encode(smokePath), updatedAt: now + 1, parentEntries: encode(entries) });
  const rootIndex = (await client.queryLatest("getDirectoryIndex", encode("/home/user"))).value;
  const rootEntries = rootIndex?.entries instanceof Uint8Array ? new TextDecoder().decode(rootIndex.entries).split("\n").filter(Boolean).filter((entry) => entry !== ".release-smoke").join("\n") : "";
  await submit("removeNode", { key, path: encode(smokeDir), updatedAt: now + 2, parentEntries: encode(rootEntries) });
  const removed = (await client.queryLatest("getNodeMetadata", encode(smokePath))).value;
  if (!removed || !removed.removed) fail("STATE_NOT_FINALIZED", "Finalized cleanup state was not readable", { path: smokePath });
  console.log(JSON.stringify({ smoke: "mutation", result: "PASS", serviceId, path: smokePath, content, operations: results, finalVerification: "PASS" }, null, 2));
}

if (mode === "read") await readSmoke().catch((error) => fail("READ_FAILED", error.message));
else if (mode === "write") await mutationSmoke().catch((error) => fail("MUTATION_FAILED", error.message));
else fail("CONFIGURATION_FAILED", "usage: smoke-live.mjs read|write");
