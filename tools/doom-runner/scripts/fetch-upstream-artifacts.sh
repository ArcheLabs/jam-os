#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="$ROOT_DIR/upstream.lock"
DEST_DIR="${DOOM_RUNNER_ARTIFACT_DIR:-$ROOT_DIR/upstream/roms}"
CHECKSUM_FILE="$ROOT_DIR/upstream/checksums.blake2b"

read_lock() { sed -n "s/^$1=//p" "$LOCK_FILE" | head -n1; }
POLKAVM_COMMIT="$(read_lock POLKAVM_COMMIT)"
BASE_URL="https://raw.githubusercontent.com/paritytech/polkavm/$POLKAVM_COMMIT/examples/doom/roms"

mkdir -p "$DEST_DIR"
for name in doom.polkavm doom1.wad doom-wad-shareware-license.txt; do
  url="$BASE_URL/$name"
  tmp="$DEST_DIR/$name.part"
  if [[ -s "$DEST_DIR/$name" ]]; then
    echo "using existing $DEST_DIR/$name"
  else
    echo "fetching $url"
    curl --fail --location --retry 5 --retry-delay 2 --output "$tmp" "$url"
    mv "$tmp" "$DEST_DIR/$name"
  fi
done

python3 - "$DEST_DIR" "$CHECKSUM_FILE" <<'PY'
import hashlib
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
checksum_file = pathlib.Path(sys.argv[2])
expected = {}
for line in checksum_file.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    digest, name = line.split(None, 1)
    if digest.startswith("__"):
        raise SystemExit(f"missing committed checksum for {name}")
    expected[name] = digest

for name, digest in expected.items():
    path = root / name
    if not path.is_file():
        raise SystemExit(f"missing fetched artifact: {path}")
    actual = hashlib.blake2b(path.read_bytes(), digest_size=32).hexdigest()
    if actual != digest:
        raise SystemExit(f"BLAKE2b-256 mismatch for {name}: expected {digest}, got {actual}")
    print(f"verified {name} BLAKE2b-256={actual}")
PY
