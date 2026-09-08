import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { blake2AsHex } from "@polkadot/util-crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = path.join(root, "services/computer");
const promoted = path.join(root, "artifacts/computer/stage1/scriptc");
const applicationFiles = ["service.blob", "service.polkavm", "build.json", "checksums.json", "service.abi.json"];
const [command = "check", requestedOutput] = process.argv.slice(2);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readRevision(lock) {
  const source = fs.readFileSync(path.join(root, "toolchains", lock), "utf8");
  const repository = source.match(/^repository = "([^"]+)"$/m)?.[1];
  const revision = source.match(/^revision = "([0-9a-f]{40})"$/m)?.[1];
  if (!repository || !revision) throw new Error(`Invalid ${lock}`);
  return { repository, revision };
}

function hashFile(file) {
  return blake2AsHex(fs.readFileSync(file), 256);
}

function walk(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    return entry.isDirectory() ? walk(path.join(directory, entry.name), relative) : [relative];
  }).sort();
}

function assertPinnedCheckouts() {
  const dependencies = [
    ["JamScript", "jamscript.lock", path.join(root, ".toolchain/JamScript")],
    ["MiniJAM client", "minijam-client.lock", path.join(root, ".toolchain/minijam-client")],
  ];
  for (const [label, lock, directory] of dependencies) {
    const { revision } = readRevision(lock);
    if (!fs.existsSync(path.join(directory, ".git"))) throw new Error(`${label} checkout is missing; run npm run toolchain:bootstrap`);
    const result = spawnSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" });
    if (result.status !== 0 || result.stdout.trim() !== revision) throw new Error(`${label} checkout is not pinned to ${revision}`);
  }
}

function jamScriptInvocation() {
  if (process.env.JAMSCRIPT_BIN) return { command: process.env.JAMSCRIPT_BIN, args: [] };
  const localBinary = path.join(root, ".toolchain/JamScript/target/debug/jamscript");
  if (fs.existsSync(localBinary)) return { command: localBinary, args: [] };
  return {
    command: "cargo",
    args: ["run", "--quiet", "--locked", "--manifest-path", path.join(root, ".toolchain/JamScript/Cargo.toml"), "--bin", "jamscript", "--"],
  };
}

function runJamScript(args, needsSdk = false) {
  const invocation = jamScriptInvocation();
  const env = needsSdk
    ? { ...process.env, JAMSCRIPT_MINIJAM_SDK: path.join(root, ".toolchain/minijam-client") }
    : process.env;
  const result = spawnSync(invocation.command, [...invocation.args, ...args], {
    cwd: root,
    stdio: "inherit",
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`JamScript ${args[0]} failed with status ${result.status}`);
}

function sanitizeBuildMetadata(directory) {
  const file = path.join(directory, "build.json");
  const generated = readJson(file);
  const application = {
    format: "jam-computer-artifact/v1",
    serviceKey: generated.serviceKey,
    serviceInstanceId: generated.serviceInstanceId,
    management: generated.management,
    language_version: generated.language_version,
    abi_version: generated.abi_version,
    code_hash: generated.code_hash,
    abi_hash: generated.abi_hash,
  };
  fs.writeFileSync(file, `${JSON.stringify(application, null, 2)}\n`);
}

function retainApplicationFiles(directory) {
  const keep = new Set(applicationFiles.filter((file) => file !== "checksums.json"));
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() || !keep.has(entry.name)) fs.rmSync(path.join(directory, entry.name), { recursive: true, force: true });
  }
}

function rewriteChecksums(directory) {
  const files = walk(directory).filter((file) => file !== "checksums.json");
  const manifest = {
    version: 1,
    algorithm: "blake2b-256",
    files: Object.fromEntries(files.map((file) => [file, hashFile(path.join(directory, file))])),
  };
  fs.writeFileSync(path.join(directory, "checksums.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function normalizeArtifactModes(directory) {
  for (const relative of walk(directory)) fs.chmodSync(path.join(directory, relative), 0o644);
}

function verifyArtifact(directory) {
  if (!fs.existsSync(directory)) throw new Error(`Computer artifact directory is missing: ${directory}`);
  const actualFiles = walk(directory);
  if (JSON.stringify(actualFiles) !== JSON.stringify([...applicationFiles].sort())) {
    throw new Error(`Computer artifact must contain only application files: ${actualFiles.join(", ")}`);
  }
  for (const file of applicationFiles) {
    if (!fs.existsSync(path.join(directory, file)) || fs.statSync(path.join(directory, file)).size === 0) throw new Error(`Computer artifact is missing ${file}`);
  }

  const manifest = readJson(path.join(directory, "checksums.json"));
  if (manifest.version !== 1 || manifest.algorithm !== "blake2b-256" || !manifest.files) throw new Error("Invalid artifact checksum manifest");
  const checksumFiles = Object.keys(manifest.files).sort();
  const contentFiles = actualFiles.filter((file) => file !== "checksums.json");
  if (JSON.stringify(checksumFiles) !== JSON.stringify(contentFiles)) throw new Error("Artifact checksum manifest does not cover the application files exactly");
  for (const [relative, expected] of Object.entries(manifest.files)) {
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw new Error(`Invalid artifact checksum path ${relative}`);
    if (hashFile(path.join(directory, relative)).toLowerCase() !== String(expected).toLowerCase()) throw new Error(`Artifact checksum mismatch for ${relative}`);
  }

  const build = readJson(path.join(directory, "build.json"));
  const manifestToml = fs.readFileSync(path.join(project, "jamscript.toml"), "utf8");
  const identity = readJson(path.join(project, ".jamscript/service.json"));
  const abi = readJson(path.join(directory, "service.abi.json"));
  const expectedAbi = readJson(path.join(project, "abi/service.abi.json"));
  const artifactActionNames = new Set(abi.actions?.map((action) => action.name));
  const artifactQueryNames = new Set(abi.queries?.map((query) => query.name));
  const artifactStateSchemas = new Set(abi.state?.map((entry) => entry.schema));
  const assertions = [
    [build.format === "jam-computer-artifact/v1", "artifact build format is invalid"],
    [build.language_version === "0.2", "language_version must be 0.2"],
    [build.abi_version === 1, "abi_version must be 1"],
    [build.management?.mode === "immutable", "management.mode must be immutable"],
    [build.serviceKey === identity.serviceKey, "artifact service key does not match the Computer identity"],
    [build.serviceInstanceId === identity.instanceId, "artifact service instance ID does not match the Computer identity"],
    [typeof build.code_hash === "string" && /^0x[0-9a-f]{64}$/i.test(build.code_hash), "code_hash is missing or malformed"],
    [build.code_hash?.toLowerCase() === hashFile(path.join(directory, "service.blob")).toLowerCase(), "code_hash does not match service.blob"],
    [build.abi_hash?.toLowerCase() === hashFile(path.join(directory, "service.abi.json")).toLowerCase(), "abi_hash does not match service.abi.json"],
    [abi.language_version === "0.2", "artifact ABI language_version must be 0.2"],
    [expectedAbi.actions.every((action) => artifactActionNames.has(action.name)), "artifact ABI is missing a Computer application action"],
    [expectedAbi.queries.every((query) => artifactQueryNames.has(query.name)), "artifact ABI is missing a Computer application query"],
    [expectedAbi.state.every((entry) => artifactStateSchemas.has(entry.schema)), "artifact ABI is missing a Computer application state schema"],
    [manifestToml.includes('entry = "src/service.ts"'), "production entry must be services/computer/src/service.ts"],
    [manifestToml.includes('backend = "scriptc"'), "production backend must be ScriptC"],
    [manifestToml.includes('mode = "immutable"'), "production management mode must be immutable"],
    [fs.existsSync(path.join(project, "src/service.ts")), "canonical service.ts is missing"],
  ];
  for (const [condition, message] of assertions) if (!condition) throw new Error(message);
  return build.code_hash;
}

function buildArtifact(output) {
  assertPinnedCheckouts();
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  runJamScript(["build", project, "--output", output], true);
  sanitizeBuildMetadata(output);
  retainApplicationFiles(output);
  normalizeArtifactModes(output);
  rewriteChecksums(output);
  const hash = verifyArtifact(output);
  console.log(`COMPUTER_ARTIFACT_BUILD=PASS\nCOMPUTER_ARTIFACT_CODE_HASH=${hash}`);
}

function main() {
  if (!["build", "check", "verify"].includes(command)) throw new Error("usage: computer-artifact.mjs build|check|verify [output]");
  if (command === "check") {
    assertPinnedCheckouts();
    runJamScript(["check", project]);
    console.log("COMPUTER_SERVICE_CHECK=PASS");
    return;
  }
  if (command === "verify") {
    const hash = verifyArtifact(promoted);
    console.log(`COMPUTER_ARTIFACT_VERIFY=PASS\nCOMPUTER_ARTIFACT_CODE_HASH=${hash}`);
    return;
  }
  const output = path.resolve(requestedOutput || process.env.COMPUTER_ARTIFACT_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), "jam-computer-artifact-")));
  buildArtifact(output);
}

try {
  main();
} catch (error) {
  console.error(`COMPUTER_ARTIFACT=FAIL\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
