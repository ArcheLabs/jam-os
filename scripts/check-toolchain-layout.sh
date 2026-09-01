#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAMSCRIPT_DIR="${1:-$ROOT_DIR/.toolchain/JamScript}"
MINIJAM_DIR="${2:-$ROOT_DIR/.toolchain/minijam-client}"

test -e "$JAMSCRIPT_DIR/.git" || { echo "TOOLCHAIN_LAYOUT_MISSING: $JAMSCRIPT_DIR/.git" >&2; exit 1; }
test -f "$JAMSCRIPT_DIR/packages/client/package.json" || { echo "TOOLCHAIN_LAYOUT_MISSING: $JAMSCRIPT_DIR/packages/client/package.json" >&2; exit 1; }
test -e "$MINIJAM_DIR/.git" || { echo "TOOLCHAIN_LAYOUT_MISSING: $MINIJAM_DIR/.git" >&2; exit 1; }

jamscript_revision="$($ROOT_DIR/scripts/check-jamscript-pin.sh "$JAMSCRIPT_DIR")"
minijam_revision="$($ROOT_DIR/scripts/check-minijam-client-pin.sh "$MINIJAM_DIR")"
printf 'TOOLCHAIN_LAYOUT=PASS\nJamScript: %s\nMiniJAM client: %s\n' "$jamscript_revision" "$minijam_revision"
