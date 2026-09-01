#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKOUT="${JAMSCRIPT_CHECKOUT:-$ROOT_DIR/.toolchain/JamScript}"
OUTPUT="$ROOT_DIR/services/jns/abi/service.abi.json"

revision="$($ROOT_DIR/scripts/check-jamscript-pin.sh "$CHECKOUT")"

mkdir -p "$(dirname "$OUTPUT")"
(cd "$CHECKOUT" && cargo run --quiet --locked --bin jamscript -- abi "$ROOT_DIR/services/jns") > "$OUTPUT"
echo "generated canonical JNS ABI with JamScript $revision"
