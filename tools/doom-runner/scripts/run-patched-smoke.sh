#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/../../artifacts/doom/legacy-rv32"
ROM_DIR="$ROOT_DIR/upstream/roms"

"$ROOT_DIR/guest/verify.sh"
cargo run --manifest-path "$ROOT_DIR/runner/Cargo.toml" --release -- \
  --patched "$ARTIFACT_DIR/doom.polkavm" "$ROM_DIR/doom1.wad"
