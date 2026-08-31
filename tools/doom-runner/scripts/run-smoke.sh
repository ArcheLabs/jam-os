#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROM_DIR="${DOOM_RUNNER_ARTIFACT_DIR:-$ROOT_DIR/upstream/roms}"

"$ROOT_DIR/scripts/fetch-upstream-artifacts.sh" >/dev/null
cargo run --manifest-path "$ROOT_DIR/runner/Cargo.toml" --release -- \
  "$ROM_DIR/doom.polkavm" "$ROM_DIR/doom1.wad"
