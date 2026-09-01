#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKOUT="${JAMSCRIPT_CHECKOUT:-$ROOT_DIR/.toolchain/JamScript}"
EXPECTED="$ROOT_DIR/services/jns/abi/service.abi.json"
TMP_ABI="$(mktemp /tmp/jns-service-abi.XXXXXX.json)"

revision="$($ROOT_DIR/scripts/check-jamscript-pin.sh "$CHECKOUT")"
(cd "$CHECKOUT" && cargo run --quiet --locked --bin jamscript -- abi "$ROOT_DIR/services/jns") > "$TMP_ABI"
diff --unified "$EXPECTED" "$TMP_ABI"
echo "canonical JNS ABI matches JamScript $revision"
