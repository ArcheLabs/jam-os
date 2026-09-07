#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERIFY_ONLY=false
if [[ "${1:-}" == "--verify-only" ]]; then
  VERIFY_ONLY=true
elif [[ "${1:-}" != "" ]]; then
  echo "usage: $0 [--verify-only]" >&2
  exit 2
fi

declare -A PINS=()
while IFS='=' read -r key value; do
  PINS["$key"]="$value"
done < <(node "$ROOT_DIR/scripts/read-toolchain-pins.mjs")

ensure_checkout() {
  local label="$1" repository="$2" revision="$3" directory="$4"
  local fresh=false
  if [[ ! -e "$directory" ]]; then
    $VERIFY_ONLY && { echo "TOOLCHAIN_LAYOUT_MISSING: $directory" >&2; exit 1; }
    mkdir -p "$(dirname "$directory")"
    git clone --no-checkout "$repository" "$directory"
    fresh=true
  fi
  test -e "$directory/.git" || { echo "$label checkout is not a git repository: $directory" >&2; exit 1; }
  if ! git -C "$directory" cat-file -e "$revision^{commit}" 2>/dev/null; then
    $VERIFY_ONLY && { echo "$label revision is unavailable in $directory" >&2; exit 1; }
    git -C "$directory" fetch --depth=1 origin "$revision"
  fi
  if [[ "$fresh" == true ]]; then
    git -C "$directory" checkout --detach --force "$revision" >/dev/null
  elif ! git -C "$directory" diff --quiet || ! git -C "$directory" diff --cached --quiet; then
    echo "$label checkout has local changes: $directory" >&2
    exit 1
  fi
  $VERIFY_ONLY && return
  [[ "$fresh" == true ]] && return
  git -C "$directory" checkout --detach --force "$revision" >/dev/null
}

ensure_checkout "JamScript" "${PINS[JAMSCRIPT_REPOSITORY_URL]}" "${PINS[JAMSCRIPT_REVISION]}" "$ROOT_DIR/.toolchain/JamScript"
ensure_checkout "MiniJAM client" "${PINS[MINIJAM_CLIENT_REPOSITORY_URL]}" "${PINS[MINIJAM_CLIENT_REVISION]}" "$ROOT_DIR/.toolchain/minijam-client"
"$ROOT_DIR/scripts/check-toolchain-layout.sh"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
