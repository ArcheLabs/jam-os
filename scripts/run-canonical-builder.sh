#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="$ROOT_DIR/toolchains/builder.lock"

if ! command -v docker >/dev/null; then
  echo "CANONICAL_BUILDER_RUNTIME=BLOCKED" >&2
  exit 1
fi
if ! docker version >/dev/null 2>&1; then
  echo "CANONICAL_BUILDER_RUNTIME=FAIL" >&2
  exit 1
fi
node "$ROOT_DIR/scripts/check-builder-lock.mjs"

read_lock() {
  local key="$1"
  sed -nE "s/^${key} = \"([^\"]+)\"$/\1/p" "$LOCK_FILE"
}

image="$(read_lock image)"
digest="$(read_lock digest)"
reference="${image}@${digest}"
docker pull "$reference" >/dev/null
repo_digests="$(docker image inspect "$reference" --format '{{join .RepoDigests "\n"}}')"
grep -Fxq "$reference" <<<"$repo_digests" || {
  echo "CANONICAL_BUILDER_DIGEST=FAIL: pulled image does not expose ${reference}" >&2
  exit 1
}

docker run --rm --platform linux/amd64 \
  --user "$(id -u):$(id -g)" \
  --env JAM_CANONICAL_BUILDER=1 \
  --env JAM_CANONICAL_BUILDER_VERSION=1 \
  --env JAM_CANONICAL_BUILDER_ENV=1 \
  --env JAM_CANONICAL_BUILDER_DIGEST="$digest" \
  --env RUSTUP_HOME=/root/.rustup \
  --env CARGO_HOME=/tmp/jam-cargo \
  --env CARGO_TARGET_DIR=/tmp/jam-target \
  --volume "$ROOT_DIR:/workspace" \
  --workdir /workspace \
  "$reference" \
  node /workspace/scripts/check-builder-env.mjs

docker run --rm --platform linux/amd64 \
  --user "$(id -u):$(id -g)" \
  --env JAM_CANONICAL_BUILDER=1 \
  --env JAM_CANONICAL_BUILDER_VERSION=1 \
  --env JAM_CANONICAL_BUILDER_ENV=1 \
  --env JAM_CANONICAL_BUILDER_DIGEST="$digest" \
  --env RUSTUP_HOME=/root/.rustup \
  --env CARGO_HOME=/tmp/jam-cargo \
  --env CARGO_TARGET_DIR=/tmp/jam-target \
  --volume "$ROOT_DIR:/workspace" \
  --workdir /workspace \
  "$reference" "$@"
