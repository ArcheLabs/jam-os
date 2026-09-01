#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="$ROOT_DIR/toolchains/jamscript.lock"
CHECKOUT="${1:-}"

test -f "$LOCK_FILE" || { echo "missing JamScript lock: $LOCK_FILE" >&2; exit 1; }
revision="$(sed -n 's/^revision = "\([0-9a-fA-F]*\)"$/\1/p' "$LOCK_FILE")"
test "${#revision}" -eq 40 || { echo "JamScript lock revision must be 40 hexadecimal characters" >&2; exit 1; }
[[ "$revision" =~ ^[0-9a-fA-F]{40}$ ]] || { echo "JamScript lock revision is not hexadecimal" >&2; exit 1; }

if [[ -n "$CHECKOUT" ]]; then
  test -d "$CHECKOUT/.git" || { echo "missing JamScript checkout: $CHECKOUT" >&2; exit 1; }
  actual="$(git -C "$CHECKOUT" rev-parse HEAD)"
  test "$actual" = "$revision" || {
    echo "JamScript checkout mismatch: expected $revision, got $actual" >&2
    exit 1
  }
fi

printf '%s\n' "$revision"
