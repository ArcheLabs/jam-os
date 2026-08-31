#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/../.." && pwd)"
LOCK_FILE="$ROOT_DIR/upstream.lock"
PATCH_FILE="$ROOT_DIR/guest/polkadoom-run-v1.patch"
WAD_FILE="$ROOT_DIR/upstream/roms/doom1.wad"
OUTPUT_DIR="$REPO_ROOT/artifacts/doom/stage1"

read_lock() { sed -n "s/^$1=//p" "$LOCK_FILE" | head -n1; }
POLKAVM_REPOSITORY="$(read_lock POLKAVM_REPOSITORY)"
POLKAVM_COMMIT="$(read_lock POLKAVM_COMMIT)"
POLKADOOM_REPOSITORY="$(read_lock POLKADOOM_REPOSITORY)"
POLKADOOM_COMMIT="$(read_lock POLKADOOM_COMMIT)"

for command_name in git clang clang++ cargo python3; do
  command -v "$command_name" >/dev/null || { echo "missing required tool: $command_name" >&2; exit 1; }
done

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/jam-doom-m2.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "clang: $(clang --version | head -n1)"
echo "rust: $(rustc --version)"
echo "target probe: riscv32-unknown-none-elf / rv32emac / ilp32e"
printf 'int main(void) { return 0; }\n' | clang --target=riscv32-unknown-none-elf -march=rv32emac -mabi=ilp32e -x c -c -o "$WORK_DIR/target-probe.o" -

if [[ -n "${POLKADOOM_SOURCE_DIR:-}" ]]; then
  cp -a "$POLKADOOM_SOURCE_DIR" "$WORK_DIR/polkadoom"
else
  git clone --filter=blob:none --no-checkout "$POLKADOOM_REPOSITORY" "$WORK_DIR/polkadoom"
  git -C "$WORK_DIR/polkadoom" checkout --detach "$POLKADOOM_COMMIT"
fi
test "$(git -C "$WORK_DIR/polkadoom" rev-parse HEAD)" = "$POLKADOOM_COMMIT"
test -z "$(git -C "$WORK_DIR/polkadoom" status --porcelain)"
git -C "$WORK_DIR/polkadoom" apply --check "$PATCH_FILE"
git -C "$WORK_DIR/polkadoom" apply "$PATCH_FILE"
test -n "$(git -C "$WORK_DIR/polkadoom" diff -- src/impl.c)"
grep -q '"-skill", "3", "-warp", "1", "1"' "$WORK_DIR/polkadoom/src/impl.c"

if [[ -n "${POLKAVM_SOURCE_DIR:-}" ]]; then
  cp -a "$POLKAVM_SOURCE_DIR" "$WORK_DIR/polkavm"
else
  git clone --filter=blob:none --no-checkout "$POLKAVM_REPOSITORY" "$WORK_DIR/polkavm"
  git -C "$WORK_DIR/polkavm" checkout --detach "$POLKAVM_COMMIT"
fi
test "$(git -C "$WORK_DIR/polkavm" rev-parse HEAD)" = "$POLKAVM_COMMIT"
test -z "$(git -C "$WORK_DIR/polkavm" status --porcelain)"
# The pinned workspace also declares SDL examples. They are not part of the
# linker build and can require an unrelated git dependency, so remove only
# those workspace members in this disposable checkout before invoking Cargo.
sed -i '/"examples\/doom",/d; /"examples\/quake",/d' "$WORK_DIR/polkavm/Cargo.toml"
if [[ -n "${POLKATOOL_BIN:-}" ]]; then
  POLKATOOL="$POLKATOOL_BIN"
else
  cargo build --release --manifest-path "$WORK_DIR/polkavm/Cargo.toml" -p polkatool
  POLKATOOL="$WORK_DIR/polkavm/target/release/polkatool"
fi
POLKATOOL_VERSION="$($POLKATOOL --version 2>/dev/null || $POLKATOOL --help | head -n1)"
export POLKATOOL_VERSION
echo "polkatool: $POLKATOOL_VERSION"

export SOURCE_DATE_EPOCH="$(git -C "$WORK_DIR/polkadoom" log -1 --format=%ct)"
(
  cd "$WORK_DIR/polkadoom"
  ./build.sh 32
  "$POLKATOOL" link -s output/doom32.elf -o output/doom.polkavm
  "$POLKATOOL" disassemble output/doom.polkavm > "$WORK_DIR/doom.disassembly"
  grep -q "export #[^:]*: 'ext_run_status'" "$WORK_DIR/doom.disassembly"
  grep -q "export #[^:]*: 'ext_run_tics'" "$WORK_DIR/doom.disassembly"
)

mkdir -p "$OUTPUT_DIR"
cp "$WORK_DIR/polkadoom/output/doom.polkavm" "$OUTPUT_DIR/doom.polkavm"
python3 - "$OUTPUT_DIR" "$PATCH_FILE" "$WAD_FILE" "$POLKAVM_COMMIT" "$POLKADOOM_COMMIT" <<'PY'
import hashlib
import json
import pathlib
import struct
import sys

output, patch, wad, polkavm_commit, polkadoom_commit = map(pathlib.Path, sys.argv[1:])
digest = lambda path: hashlib.blake2b(path.read_bytes(), digest_size=32).hexdigest()
guest_hash = digest(output / "doom.polkavm")
patch_hash = digest(patch)
wad_hash = digest(wad)
if wad_hash != "b1efef593aae01511b5e5359263a4d6fc0f7b5bb8248e17ec090fef11d9fbe68":
    raise SystemExit(f"unexpected doom1.wad hash: {wad_hash}")
ruleset_bytes = (b"JAM_DOOM_RULESET_V1" + bytes.fromhex(guest_hash) + bytes.fromhex(wad_hash)
                 + bytes((1, 1, 3)) + struct.pack("<II", 1, 1))
ruleset_hash = hashlib.blake2b(ruleset_bytes, digest_size=32).hexdigest()
metadata = {
    "format": "jam-doom-guest-build/v1",
    "polkavmCommit": str(polkavm_commit),
    "polkatoolCommit": str(polkavm_commit),
    "polkadoomCommit": str(polkadoom_commit),
    "patchHash": patch_hash,
    "guestHash": guest_hash,
    "wadHash": wad_hash,
    "ruleset": {"episode": 1, "map": 1, "skill": 3},
    "rulesetHash": ruleset_hash,
    "compiler": {"clang": " ".join(__import__("subprocess").check_output(["clang", "--version"], text=True).splitlines()[:1]), "target": "riscv32-unknown-none-elf/rv32emac/ilp32e", "rust": __import__("subprocess").check_output(["rustc", "--version"], text=True).strip(), "polkatool": __import__("os").environ.get("POLKATOOL_VERSION", "unknown")},
}
(output / "build.json").write_text(json.dumps(metadata, indent=2) + "\n")
(output / "checksums.json").write_text(json.dumps({"doom.polkavm": guest_hash, "doom1.wad": wad_hash, "polkadoom-run-v1.patch": patch_hash}, indent=2) + "\n")
(output / "ruleset.json").write_text(json.dumps({"format": "DoomRulesetV1", "encoding": "JAM_DOOM_RULESET_V1 || guestHash[32] || wadHash[32] || u8(episode) || u8(map) || u8(skill) || u32LE(inputProtocolVersion) || u32LE(replayProtocolVersion)", "guestHash": guest_hash, "wadHash": wad_hash, "episode": 1, "map": 1, "skill": 3, "inputProtocolVersion": 1, "replayProtocolVersion": 1, "rulesetHash": ruleset_hash}, indent=2) + "\n")
print(json.dumps(metadata, indent=2))
PY
