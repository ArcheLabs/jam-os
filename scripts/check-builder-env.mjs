import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedNode = "v24.15.0";
const expectedRust = "nightly-2026-05-02";

try {
  if (process.env.JAM_CANONICAL_BUILDER !== "1" || process.env.JAM_CANONICAL_BUILDER_VERSION !== "1") throw new Error("canonical builder marker is missing");
  if (process.platform !== "linux" || process.arch !== "x64") throw new Error("canonical builder must be linux/amd64");
  if (process.version !== expectedNode) throw new Error(`Node ${process.version} does not match ${expectedNode}`);
  const toolchains = execFileSync("rustup", ["toolchain", "list"], { encoding: "utf8" });
  if (!toolchains.split("\n").some((line) => line.startsWith(`${expectedRust}-x86_64-unknown-linux-gnu`))) throw new Error(`Rust toolchain ${expectedRust} is not installed`);
  const rust = execFileSync("rustc", ["+" + expectedRust, "--version"], { encoding: "utf8" });
  if (!rust.includes("nightly")) throw new Error(`Rust toolchain ${expectedRust} is not nightly`);
  const components = execFileSync("rustup", ["component", "list", "--toolchain", expectedRust], { encoding: "utf8" });
  if (!/^rust-src.*\(installed\)$/m.test(components)) throw new Error("rust-src is not installed in the canonical builder");
  execFileSync(process.execPath, [path.join(root, "scripts/check-llvm-lock.mjs")], { stdio: "inherit" });
  console.log("NODE_EXACT_VERSION=PASS");
  console.log("RUST_EXACT_TOOLCHAIN=PASS");
  console.log("LLVM_INTERNAL_IDENTITY=PASS");
  console.log("CANONICAL_BUILDER_ENV=PASS");
} catch (error) {
  console.error(`CANONICAL_BUILDER_ENV=FAIL\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
