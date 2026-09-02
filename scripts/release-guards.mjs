import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const deploy = fs.readFileSync(path.join(root, ".github/workflows/deploy-pages.yml"), "utf8");
const computerManifest = fs.readFileSync(path.join(root, "services/computer/jamscript.toml"), "utf8");
const computerSource = path.join(root, "services/computer/src/service.ts");
const checks = [
  [fs.existsSync(computerSource) && fs.existsSync(path.join(root, "services/computer/src/service.c")), "canonical Computer source and historical fixture must both remain"],
  [computerManifest.includes('entry = "src/service.ts"') && computerManifest.includes('backend = "scriptc"') && computerManifest.includes('mode = "immutable"'), "Computer manifest must select immutable ScriptC service.ts"],
  [!deploy.includes("services/computer/src/service.c") && !deploy.includes("compile-service c"), "Pages deployment must not compile the historical C fixture"],
  [deploy.includes("artifacts/computer/stage1/scriptc/service.blob"), "Pages deployment must publish the promoted ScriptC artifact"],
  [deploy.includes("build.json") && deploy.includes("blake2AsHex"), "Pages deployment must verify the promoted code hash"],
  [!deploy.includes("doom-service.bin") && !deploy.includes("services/doom/src/service.c") && !deploy.includes("VITE_DOOM"), "Doom must not be in the Pages release path"],
  [fs.readFileSync(path.join(root, "src/App.tsx"), "utf8").includes("VITE_JAM_MODE !== \"live\""), "preview override must be disabled in live mode"],
  [fs.readFileSync(path.join(root, "src/runtime/minijam/MiniJamRuntime.ts"), "utf8").includes('source: "unavailable"'), "live runtime must expose an unavailable state instead of mock data"],
  [fs.readFileSync(path.join(root, "src/runtime/minijam/MiniJamRuntime.ts"), "utf8").includes("DeferredDoomRuntime") && !fs.readFileSync(path.join(root, "src/runtime/minijam/MiniJamRuntime.ts"), "utf8").includes("RealDoomRunnerRuntime"), "live product runtime must use the deferred Doom capability"],
];
const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) { console.error("RELEASE_GUARD=FAIL\n" + failures.join("\n")); process.exit(1); }
console.log("LEGACY_COMPUTER_FIXTURE_NOT_DEPLOYED=PASS");
console.log("DOOM_NOT_IN_RELEASE_PATH=PASS");
console.log("CANONICAL_COMPUTER_ARTIFACT=PASS");
console.log("PRODUCTION_ENV_CONTRACT=PASS");
console.log("NO_MOCK_PRODUCTION_FALLBACK=PASS");
console.log("RELEASE_GUARD=PASS");
