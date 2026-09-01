#!/usr/bin/env bash
set -euo pipefail

SERVICE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$SERVICE_ROOT/native/doom"
MANIFEST="$ROOT_DIR/full-engine-sources.txt"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/jam-doom-full-build.XXXXXX")"
CLANG="${JAMSCRIPT_LLVM_CLANG:-/usr/lib/llvm-20/bin/clang}"

"$SERVICE_ROOT/scripts/prepare-native-doom.sh"
test -x "$CLANG" || CLANG="$(command -v clang)"
test -x "$CLANG"
test -s "$MANIFEST"

mkdir -p "$WORK_DIR/objects"

COMMON_FLAGS=(
  --target=riscv64-unknown-elf
  -march=rv64emac
  -mabi=lp64e
  -ffreestanding
  -fno-builtin
  -fPIC
  -fdata-sections
  -ffunction-sections
  -Os
  -Wall
  -Wextra
  -Werror
  -std=c11
)
INCLUDES=(
  "$ROOT_DIR"
  "$ROOT_DIR/generated/polkadoom/src/include"
  "$ROOT_DIR/generated/polkadoom/libs/doomgeneric/doomgeneric"
  "$ROOT_DIR/generated/polkadoom/libs/SDL/include"
  "$ROOT_DIR/generated/polkadoom/libs/SDL/src"
  "$ROOT_DIR/generated/polkadoom/libs/SDL/src/audio"
  "$ROOT_DIR/generated/polkadoom/libs/SDL-Mixer-X/include"
  "$ROOT_DIR/generated/polkadoom/libs/SDL-Mixer-X/src"
  "$ROOT_DIR/generated/polkadoom/libs/SDL-Mixer-X/src/codecs"
  "$ROOT_DIR/generated/polkadoom/libs/libADLMIDI/include"
  "$ROOT_DIR/generated/polkadoom/libs/libcxx/include"
  "$ROOT_DIR/generated/polkadoom/libs/musl-1.2.4/src/include"
  "$ROOT_DIR/generated/polkadoom/libs/musl-1.2.4/include"
  "$ROOT_DIR/generated/polkadoom/libs/musl-1.2.4/src/internal"
  "$ROOT_DIR/generated/polkadoom/libs/musl-1.2.4/src/multibyte"
  "$ROOT_DIR/generated/polkadoom/libs/musl-1.2.4/arch/generic"
  "$ROOT_DIR/generated/polkadoom/libs/musl-1.2.4/arch/riscv64"
)

count=0
while IFS= read -r relative; do
  [[ -z "$relative" || "$relative" == \#* ]] && continue
  source="$SERVICE_ROOT/$relative"
  test -f "$source" || { echo "missing manifest source: $relative" >&2; exit 1; }
  object="$WORK_DIR/objects/$count.o"
  args=("${COMMON_FLAGS[@]}")
  for include in "${INCLUDES[@]}"; do args+=( -I "$include" ); done
  args+=( -c "$source" -o "$object" )
  echo "[doom-full] [$((count + 1))] $relative"
  "$CLANG" "${args[@]}"
  count=$((count + 1))
done < "$MANIFEST"

echo "[doom-full] compiled $count sources"
