#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAMSCRIPT_DIR="${JAMSCRIPT_CHECKOUT:-$ROOT_DIR/.toolchain/JamScript}"
MINIJAM_DIR="${JAMSCRIPT_MINIJAM_SDK:-$ROOT_DIR/.toolchain/minijam-client}"
CLANG="${JAMSCRIPT_CLANG:-/usr/lib/llvm-20/bin/clang}"

test "$(node --version)" = "v24.15.0" || {
  echo "NATIVE_PREREQUISITES_FAILED: expected Node v24.15.0, got $(node --version)" >&2
  exit 1
}
test -f "$MINIJAM_DIR/service-toolchain/sdk/src/host.c" || {
  echo "NATIVE_PREREQUISITES_FAILED: MiniJAM SDK root is invalid: $MINIJAM_DIR" >&2
  exit 1
}
test -f "$JAMSCRIPT_DIR/toolchains/scriptc/NODE_VERSION" || {
  echo "NATIVE_PREREQUISITES_FAILED: missing ScriptC toolchain metadata" >&2
  exit 1
}
test -d "$JAMSCRIPT_DIR/toolchains/scriptc/node_modules/@scriptc/runtime" || {
  echo "NATIVE_PREREQUISITES_FAILED: ScriptC dependencies are not installed" >&2
  exit 1
}
test -x "$CLANG" || {
  echo "NATIVE_PREREQUISITES_FAILED: Clang 20 is not executable at $CLANG" >&2
  exit 1
}
test -x "${JAMSCRIPT_LLVM_AR:-/usr/lib/llvm-20/bin/llvm-ar}" || {
  echo "NATIVE_PREREQUISITES_FAILED: llvm-ar 20 is not executable" >&2
  exit 1
}

echo "NATIVE_PREREQUISITES=PASS"
