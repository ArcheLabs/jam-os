import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const deploy = fs.readFileSync(path.join(root, ".github/workflows/deploy-pages.yml"), "utf8");
const ci = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
const doomResearch = fs.readFileSync(path.join(root, ".github/workflows/doom-research.yml"), "utf8");
const smoke = fs.readFileSync(path.join(root, "scripts/smoke-live.mjs"), "utf8");
const computerManifest = fs.readFileSync(path.join(root, "services/computer/jamscript.toml"), "utf8");
const runtimeIndex = fs.readFileSync(path.join(root, "src/runtime/index.ts"), "utf8");
const computerSource = path.join(root, "services/computer/src/service.ts");
const checks = [
  [fs.existsSync(computerSource) && fs.existsSync(path.join(root, "services/computer/src/service.c")), "canonical Computer source and historical fixture must both remain"],
  [computerManifest.includes('entry = "src/service.ts"') && computerManifest.includes('backend = "scriptc"') && computerManifest.includes('mode = "immutable"'), "Computer manifest must select immutable ScriptC service.ts"],
  [!deploy.includes("services/computer/src/service.c") && !deploy.includes("compile-service c"), "Pages deployment must not compile the historical C fixture"],
  [deploy.includes("artifacts/computer/stage1/scriptc/service.blob"), "Pages deployment must publish the promoted ScriptC artifact"],
  [deploy.includes("build.json") && deploy.includes("blake2AsHex"), "Pages deployment must verify the promoted code hash"],
  [ci.includes("npm run computer:check") && ci.includes("npm run computer:artifact:build") && ci.includes("npm run computer:artifact:verify") && !ci.includes("docker") && !ci.includes("ghcr.io"), "main CI must use the public JamScript interface and application artifact checks"],
  [!ci.includes("submodules: recursive") && doomResearch.includes("submodules: recursive"), "recursive Polkadoom checkout must be research-only"],
  [!deploy.includes("doom-service.bin") && !deploy.includes("services/doom/src/service.c") && !deploy.includes("VITE_DOOM"), "Doom must not be in the Pages release path"],
  [runtimeIndex.includes("const live = !forceMock && import.meta.env.VITE_JAM_MODE === \"live\""), "preview override must be disabled in live mode"],
  [fs.readFileSync(path.join(root, "src/runtime/minijam/MiniJamRuntime.ts"), "utf8").includes('source: "unavailable"'), "live runtime must expose an unavailable state instead of mock data"],
  [fs.readFileSync(path.join(root, "src/runtime/minijam/MiniJamRuntime.ts"), "utf8").includes("DeferredDoomRuntime") && !fs.readFileSync(path.join(root, "src/runtime/minijam/MiniJamRuntime.ts"), "utf8").includes("RealDoomRunnerRuntime"), "live product runtime must use the deferred Doom capability"],
  [smoke.includes("SplitRpcTransport") && smoke.includes("new SplitRpcTransport(nodeTransport, workTransport, nodeTransport)") && !smoke.includes('rpc(endpoint, "chain_getHeader"'), "live smoke must route formal Work through the independent Work RPC"],
];
const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) { console.error("RELEASE_GUARD=FAIL\n" + failures.join("\n")); process.exit(1); }
console.log("LEGACY_COMPUTER_FIXTURE_NOT_DEPLOYED=PASS");
console.log("DOOM_NOT_IN_RELEASE_PATH=PASS");
console.log("DOOM_MAIN_CI_DEPENDENCY=PASS");
console.log("COMPUTER_ARTIFACT_INTEGRITY=PASS");
console.log("PRODUCTION_ENV_CONTRACT=PASS");
console.log("NO_MOCK_PRODUCTION_FALLBACK=PASS");
console.log("RELEASE_GUARD=PASS");
