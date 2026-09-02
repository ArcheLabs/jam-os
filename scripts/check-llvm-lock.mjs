import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, "toolchains/llvm.lock");

function readLock() {
  const values = {};
  for (const line of fs.readFileSync(lockPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([a-z_][a-z0-9_]*) = "([^"]+)"$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

try {
  const lock = readLock();
  for (const key of [
    "package_version", "clang_package", "llvm_package", "lld_package",
    "libllvm20_package", "libclang_cpp20_package", "libclang_common20_package",
    "llvm_runtime20_package", "llvm_linker_tools20_package", "llvm_dev20_package",
    "libclang1_20_package", "clang_path", "llvm_ar_path", "lld_path",
    "clang_version", "clang_sha256", "llvm_ar_sha256", "lld_sha256",
    "llvm_shared_library_path", "llvm_shared_library_sha256",
    "clang_shared_library_path", "clang_shared_library_sha256", "target",
  ]) {
    if (!lock[key]) throw new Error(`llvm.lock is missing ${key}`);
  }
  const binaries = [
    ["clang", lock.clang_path, lock.clang_sha256],
    ["llvm-ar", lock.llvm_ar_path, lock.llvm_ar_sha256],
    ["ld.lld", lock.lld_path, lock.lld_sha256],
  ];
  for (const [name, file, expected] of binaries) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`${name} is missing at ${file}`);
    const actual = sha256(file);
    if (actual !== expected) throw new Error(`${name} checksum ${actual} does not match llvm.lock ${expected}`);
  }
  const sharedLibraries = new Map([
    [path.resolve(lock.llvm_shared_library_path), lock.llvm_shared_library_sha256],
    [path.resolve(lock.clang_shared_library_path), lock.clang_shared_library_sha256],
  ]);
  const linkedLibraries = new Set();
  for (const [, file] of binaries) {
    const ldd = execFileSync("ldd", [file], { encoding: "utf8" });
    for (const line of ldd.split(/\r?\n/)) {
      const match = line.match(/=>\s+(\/usr\/lib\/llvm-20\/[^\s(]+)/);
      if (!match) continue;
      const linked = path.resolve(match[1]);
      if (!sharedLibraries.has(linked)) throw new Error(`LLVM-specific dynamic library ${linked} is not locked`);
      linkedLibraries.add(linked);
    }
  }
  for (const [file, expected] of sharedLibraries) {
    if (!fs.existsSync(file)) throw new Error(`LLVM-specific dynamic library is missing at ${file}`);
    const actual = sha256(file);
    if (actual !== expected) throw new Error(`${file} checksum ${actual} does not match llvm.lock ${expected}`);
    if (!linkedLibraries.has(file)) throw new Error(`${file} is locked but was not observed by ldd`);
  }
  const version = execFileSync(lock.clang_path, ["--version"], { encoding: "utf8" }).split(/\r?\n/, 1)[0];
  if (version !== lock.clang_version) throw new Error(`clang version ${version} does not match llvm.lock ${lock.clang_version}`);
  console.log(`LLVM_CLANG_VERSION=${version}`);
  console.log(`LLVM_TARGET=${lock.target}`);
} catch (error) {
  console.error(`LLVM_TOOLCHAIN=FAIL\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
