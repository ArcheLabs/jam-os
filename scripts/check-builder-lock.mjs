import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, "toolchains/builder.lock");

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
  for (const key of ["image", "digest", "architecture", "base_image", "base_image_digest", "dockerfile", "dockerfile_sha256", "node_version", "rust_toolchain", "llvm_lock"]) {
    if (!lock[key]) throw new Error(`builder.lock is missing ${key}`);
  }
  if (lock.architecture !== "amd64") throw new Error("canonical builder architecture must be amd64");
  if (!/^sha256:[0-9a-f]{64}$/.test(lock.base_image_digest)) throw new Error("base_image_digest must be an exact SHA256 digest");
  if (!/^sha256:[0-9a-f]{64}$/.test(lock.digest)) throw new Error("builder image digest is not published and pinned");
  const dockerfile = path.join(root, lock.dockerfile);
  if (sha256(dockerfile) !== lock.dockerfile_sha256) throw new Error("builder Dockerfile checksum does not match builder.lock");
  console.log("CANONICAL_BUILDER_LOCK=PASS");
  console.log("CANONICAL_BUILDER_DIGEST=PASS");
} catch (error) {
  console.error(`CANONICAL_BUILDER_LOCK=FAIL\nCANONICAL_BUILDER_DIGEST=FAIL\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
