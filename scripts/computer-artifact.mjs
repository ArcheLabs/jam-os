import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { blake2AsHex } from "@polkadot/util-crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = path.join(root, "services/computer");
const promoted = path.join(root, "artifacts/computer/stage1/scriptc");
const requiredFiles = ["service.blob", "service.polkavm", "build.json", "builder.json", "checksums.json", "service.abi.json"];
const [command = "check", requestedOutput] = process.argv.slice(2);

function readRevision(lock) {
  const source = fs.readFileSync(path.join(root, "toolchains", lock), "utf8");
  const repository = source.match(/^repository = "([^"]+)"$/m)?.[1];
  const revision = source.match(/^revision = "([0-9a-f]{40})"$/m)?.[1];
  if (!repository || !revision) throw new Error(`Invalid ${lock}`);
  return { repository, revision };
}

function readCompilerLock() {
  const source = fs.readFileSync(path.join(root, "toolchains/llvm.lock"), "utf8");
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([a-z_][a-z0-9_]*) = "([^"]+)"$/);
    if (match) values[match[1]] = match[2];
  }
  for (const key of [
    "package_version", "clang_package", "llvm_package", "lld_package",
    "libllvm20_package", "libclang_cpp20_package", "libclang_common20_package",
    "llvm_runtime20_package", "llvm_linker_tools20_package", "llvm_dev20_package",
    "libclang1_20_package", "clang_path", "llvm_ar_path", "lld_path",
    "clang_version", "clang_sha256", "llvm_ar_sha256", "lld_sha256",
    "llvm_shared_library_path", "llvm_shared_library_sha256",
    "clang_shared_library_path", "clang_shared_library_sha256", "target",
  ]) {
    if (!values[key]) throw new Error(`llvm.lock is missing ${key}`);
  }
  return values;
}

function hashFile(file) {
  return blake2AsHex(fs.readFileSync(file), 256);
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walk(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    return entry.isDirectory() ? walk(path.join(directory, entry.name), relative) : [relative];
  }).sort();
}

function sameFile(left, right) {
  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

function normalizeGeneratedPaths(directory) {
  const absolute = path.resolve(directory);
  const replacement = "<canonical-artifact-root>";
  const binaryExtensions = new Set([".a", ".blob", ".elf", ".polkavm", ".pvm"]);
  for (const relative of walk(directory)) {
    if (relative === "checksums.json" || binaryExtensions.has(path.extname(relative))) continue;
    const file = path.join(directory, relative);
    const bytes = fs.readFileSync(file);
    const marker = Buffer.from(absolute);
    if (!bytes.includes(marker)) continue;
    const normalized = bytes.toString("utf8").replaceAll(absolute, replacement).replaceAll(absolute.replaceAll(path.sep, "/"), replacement);
    fs.writeFileSync(file, normalized);
  }
}

function rewriteChecksums(directory) {
  const file = path.join(directory, "checksums.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const relative of Object.keys(manifest.files || {})) manifest.files[relative] = hashFile(path.join(directory, relative));
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
}

function normalizeArtifactModes(directory) {
  for (const relative of walk(directory)) fs.chmodSync(path.join(directory, relative), 0o644);
}

function assertCanonicalCheckouts() {
  const jamscript = readRevision("jamscript.lock");
  const minijam = readRevision("minijam-client.lock");
  const checkouts = [
    ["JamScript", path.join(root, ".toolchain/JamScript"), jamscript.revision],
    ["MiniJAM client", path.join(root, ".toolchain/minijam-client"), minijam.revision],
  ];
  for (const [label, directory, expected] of checkouts) {
    if (!fs.existsSync(path.join(directory, ".git"))) throw new Error(`${label} checkout is missing; run npm run toolchain:bootstrap`);
    const result = spawnSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" });
    if (result.status !== 0 || result.stdout.trim() !== expected) throw new Error(`${label} checkout is not pinned to ${expected}`);
  }
  const nodeVersionFile = path.join(root, ".toolchain/JamScript/toolchains/scriptc/NODE_VERSION");
  const expectedNode = fs.readFileSync(nodeVersionFile, "utf8").trim();
  const actualNode = process.versions.node;
  if (actualNode !== expectedNode) throw new Error(`Canonical ScriptC build requires Node ${expectedNode}; got ${actualNode}`);
  return { jamscript, minijam, expectedNode };
}

function assertCanonicalCompiler() {
  const compiler = readCompilerLock();
  const lockCheck = spawnSync(process.execPath, [path.join(root, "scripts/check-llvm-lock.mjs")], { encoding: "utf8" });
  if (lockCheck.status !== 0) throw new Error(lockCheck.stderr.trim() || "LLVM lock verification failed");
  const binaries = [
    ["clang", compiler.clang_path, compiler.clang_path, compiler.clang_sha256],
    ["llvm-ar", compiler.llvm_ar_path, compiler.llvm_ar_path, compiler.llvm_ar_sha256],
    ["ld.lld", compiler.lld_path, compiler.lld_path, compiler.lld_sha256],
  ];
  for (const [name, file, canonicalPath, expected] of binaries) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Canonical ${name} is missing at ${file}; run scripts/bootstrap-llvm.sh`);
    const actual = sha256File(file);
    if (actual !== expected) throw new Error(`Canonical ${name} at ${file} has checksum ${actual}; expected ${expected} from llvm.lock`);
    if (file !== canonicalPath && name === "clang") console.warn(`Using verified ${name} from ${file}; canonical path is ${canonicalPath}`);
  }
  const version = spawnSync(compiler.clang_path, ["--version"], { encoding: "utf8" });
  if (version.status !== 0 || version.stdout.split(/\r?\n/, 1)[0] !== compiler.clang_version) {
    throw new Error(`Canonical clang version does not match llvm.lock ${compiler.clang_version}`);
  }
  return compiler;
}

function verifyArtifact(directory, pins) {
  for (const file of requiredFiles) if (!fs.existsSync(path.join(directory, file))) throw new Error(`Computer artifact is missing ${file}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "checksums.json"), "utf8"));
  if (manifest.version !== 1 || manifest.algorithm !== "blake2b-256" || !manifest.files) throw new Error("Invalid artifact checksum manifest");
  for (const [relative, expected] of Object.entries(manifest.files)) {
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw new Error(`Invalid artifact checksum path ${relative}`);
    const file = path.join(directory, relative);
    if (!fs.existsSync(file) || hashFile(file).toLowerCase() !== String(expected).toLowerCase()) throw new Error(`Artifact checksum mismatch for ${relative}`);
  }
  const build = JSON.parse(fs.readFileSync(path.join(directory, "build.json"), "utf8"));
  const manifestToml = fs.readFileSync(path.join(project, "jamscript.toml"), "utf8");
  const identity = JSON.parse(fs.readFileSync(path.join(project, ".jamscript/service.json"), "utf8"));
  const abi = JSON.parse(fs.readFileSync(path.join(directory, "service.abi.json"), "utf8"));
  const expectedNode = pins?.expectedNode || fs.readFileSync(path.join(root, ".toolchain/JamScript/toolchains/scriptc/NODE_VERSION"), "utf8").trim();
  const expectedSdk = pins?.minijam.revision || readRevision("minijam-client.lock").revision;
  const compiler = pins?.compiler || readCompilerLock();
  const assertions = [
    [build.language_version === "0.2", "language_version must be 0.2"],
    [build.backend === "scriptc-m2", "backend must be scriptc-m2"],
    [build.node_version === expectedNode, `node_version must be ${expectedNode}`],
    [build.minijam_sdk_revision === expectedSdk, `minijam_sdk_revision must be ${expectedSdk}`],
    [build.clang_version === compiler.clang_version, `clang_version must be ${compiler.clang_version}`],
    [build.management?.mode === "immutable", "management.mode must be immutable"],
    [typeof build.code_hash === "string" && /^0x[0-9a-f]{64}$/i.test(build.code_hash), "code_hash is missing or malformed"],
    [build.code_hash?.toLowerCase() === hashFile(path.join(directory, "service.blob")).toLowerCase(), "code_hash does not match service.blob"],
    [build.abi_hash?.toLowerCase() === hashFile(path.join(directory, "service.abi.json")).toLowerCase(), "abi_hash does not match service.abi.json"],
    [abi.language_version === "0.2", "artifact ABI language_version must be 0.2"],
    [manifestToml.includes('entry = "src/service.ts"'), "production entry must be services/computer/src/service.ts"],
    [manifestToml.includes('backend = "scriptc"'), "production backend must be ScriptC"],
    [manifestToml.includes('mode = "immutable"'), "production management mode must be immutable"],
    [fs.existsSync(path.join(project, "src/service.ts")), "canonical service.ts is missing"],
    [identity.serviceKey === build.serviceKey, "artifact service key does not match the Computer identity"],
  ];
  for (const [condition, message] of assertions) if (!condition) throw new Error(message);
  return { build, hash: build.code_hash };
}

function build(output) {
  const pins = assertCanonicalCheckouts();
  const compiler = assertCanonicalCompiler();
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  const result = spawnSync("cargo", ["run", "--quiet", "--locked", "--manifest-path", path.join(root, ".toolchain/JamScript/Cargo.toml"), "--bin", "jamscript", "--", "build", project, "--output", output], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      JAMSCRIPT_CLANG: compiler.clang_path,
      JAMSCRIPT_LLVM_AR: compiler.llvm_ar_path,
      JAMSCRIPT_LLVM_LD: compiler.lld_path,
      SCRIPTC_NODE: process.execPath,
      JAMSCRIPT_MINIJAM_SDK: path.join(root, ".toolchain/minijam-client"),
    },
  });
  if (result.status !== 0) throw new Error(`Canonical Computer artifact build failed with status ${result.status}`);
  normalizeGeneratedPaths(output);
  rewriteChecksums(output);
  normalizeArtifactModes(output);
  verifyArtifact(output, { ...pins, compiler });
  console.log(`CANONICAL_COMPUTER_ARTIFACT=PASS\nCOMPUTER_ARTIFACT_CODE_HASH=${JSON.parse(fs.readFileSync(path.join(output, "build.json"), "utf8")).code_hash}`);
}

function compare(left, right) {
  const leftFiles = walk(left);
  const rightFiles = walk(right);
  if (JSON.stringify(leftFiles) !== JSON.stringify(rightFiles)) throw new Error(`Artifact file set differs:\n${leftFiles.join("\n")}\n---\n${rightFiles.join("\n")}`);
  for (const relative of leftFiles) if (!sameFile(path.join(left, relative), path.join(right, relative))) throw new Error(`Non-reproducible artifact file: ${relative}`);
}

function main() {
  if (!["build", "check", "verify", "promote"].includes(command)) throw new Error("usage: computer-artifact.mjs build|check|verify|promote [output]");
  if (command === "verify") {
    const pins = assertCanonicalCheckouts();
    const result = verifyArtifact(promoted, pins);
    console.log(`CANONICAL_COMPUTER_ARTIFACT=PASS\nCOMPUTER_ARTIFACT_CODE_HASH=${result.hash}`);
    return;
  }
  if (command === "build") {
    build(path.resolve(requestedOutput || process.env.COMPUTER_ARTIFACT_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), "jam-computer-stage1-"))));
    return;
  }
  if (command === "check") {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), "jam-computer-stage1-check-"));
    try { const pins = assertCanonicalCheckouts(); const compiler = assertCanonicalCompiler(); build(output); verifyArtifact(promoted, { ...pins, compiler }); compare(output, promoted); console.log("COMPUTER_ARTIFACT_REPRODUCIBILITY=PASS\nCOMPUTER_ARTIFACT_PROMOTED=PASS"); } finally { fs.rmSync(output, { recursive: true, force: true }); }
    return;
  }
  const first = fs.mkdtempSync(path.join(os.tmpdir(), "jam-computer-stage1-a-"));
  const second = fs.mkdtempSync(path.join(os.tmpdir(), "jam-computer-stage1-b-"));
  try {
    build(first);
    build(second);
    compare(first, second);
    fs.rmSync(promoted, { recursive: true, force: true });
    fs.cpSync(first, promoted, { recursive: true });
    normalizeArtifactModes(promoted);
    verifyArtifact(promoted, assertCanonicalCheckouts());
    console.log("COMPUTER_ARTIFACT_REPRODUCIBILITY=PASS\nCOMPUTER_ARTIFACT_PROMOTED=PASS");
  } finally {
    fs.rmSync(first, { recursive: true, force: true });
    fs.rmSync(second, { recursive: true, force: true });
  }
}

try { main(); } catch (error) { console.error(`CANONICAL_COMPUTER_ARTIFACT=FAIL\n${error instanceof Error ? error.message : String(error)}`); process.exit(1); }
