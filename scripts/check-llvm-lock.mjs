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
  for (const key of ["clang_path", "llvm_ar_path", "lld_path", "clang_version", "clang_sha256", "llvm_ar_sha256", "lld_sha256", "target"]) {
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
  const version = execFileSync(lock.clang_path, ["--version"], { encoding: "utf8" }).split(/\r?\n/, 1)[0];
  if (version !== lock.clang_version) throw new Error(`clang version ${version} does not match llvm.lock ${lock.clang_version}`);
  console.log(`LLVM_CLANG_VERSION=${version}`);
  console.log(`LLVM_TARGET=${lock.target}`);
} catch (error) {
  console.error(`LLVM_TOOLCHAIN=FAIL\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
