#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACTION_FILE="$ROOT_DIR/.github/actions/bootstrap-toolchains/action.yml"
test -f "$ACTION_FILE" || { echo "missing composite action manifest: $ACTION_FILE" >&2; exit 1; }

ruby - "$ACTION_FILE" <<'RUBY'
require "yaml"
file = ARGV.fetch(0)
manifest = YAML.load_file(file)
abort "composite action manifest must be a mapping" unless manifest.is_a?(Hash)
abort "composite action must declare runs.using=composite" unless manifest.dig("runs", "using") == "composite"
RUBY

echo "ACTION_MANIFEST_YAML=PASS"
