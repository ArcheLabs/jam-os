#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="$ROOT_DIR/native/doom/upstream/polkadoom"
PATCH_DIR="$ROOT_DIR/native/doom/patches"
GENERATED="$ROOT_DIR/native/doom/generated"
WAD="$ROOT_DIR/native/doom/assets/doom1.wad"
EXPECTED_POLKADOOM="cc68c85c172fd3d30a5561250f027640ac4e099e"
EXPECTED_WAD="b1efef593aae01511b5e5359263a4d6fc0f7b5bb8248e17ec090fef11d9fbe68"
RULESET_HASH="0x49d65a8cb7ebbd05b9b1d0ef11095a6d924863f45e3afc1488e89b108652d97f"

test -e "$UPSTREAM/.git" || { echo "missing pinned Polkadoom submodule" >&2; exit 1; }
test "$(git -C "$UPSTREAM" rev-parse HEAD)" = "$EXPECTED_POLKADOOM" || { echo "unexpected Polkadoom commit" >&2; exit 1; }
test -z "$(git -C "$UPSTREAM" status --porcelain)" || { echo "pinned Polkadoom tree is dirty" >&2; exit 1; }
test "$(python3 -c 'import hashlib,sys; print(hashlib.blake2b(open(sys.argv[1],"rb").read(),digest_size=32).hexdigest())' "$WAD")" = "$EXPECTED_WAD" || { echo "unexpected doom1.wad hash" >&2; exit 1; }

rm -rf "$GENERATED"
mkdir -p "$GENERATED/polkadoom"
git -C "$UPSTREAM" archive "$EXPECTED_POLKADOOM" | tar -x -C "$GENERATED/polkadoom"
while IFS= read -r patch; do
  relative_patch="${patch#"$ROOT_DIR/"}"
  git -C "$ROOT_DIR" apply --directory="services/doom/native/doom/generated/polkadoom" "$relative_patch"
done < <(find "$PATCH_DIR" -maxdepth 1 -type f -name '*.patch' -print | sort)

python3 - "$WAD" "$GENERATED/wad.c" "$GENERATED/wad.h" <<'PY'
import hashlib, pathlib, sys
wad, c_path, h_path = map(pathlib.Path, sys.argv[1:])
data = wad.read_bytes()
if hashlib.blake2b(data, digest_size=32).hexdigest() != "b1efef593aae01511b5e5359263a4d6fc0f7b5bb8248e17ec090fef11d9fbe68": raise SystemExit("unexpected doom1.wad hash")
h_path.write_text("#pragma once\n#include <stddef.h>\n#include <stdint.h>\nextern const uint8_t jam_doom_wad[];\nextern const size_t jam_doom_wad_size;\n")
with c_path.open("w") as out:
    out.write("#include \"wad.h\"\nconst uint8_t jam_doom_wad[] = {")
    for i, byte in enumerate(data):
        if i % 16 == 0: out.write("\n  ")
        out.write(f"0x{byte:02x}, ")
    out.write("\n};\nconst size_t jam_doom_wad_size = sizeof(jam_doom_wad);\n")
PY

python3 - "$GENERATED/build-input.json" "$EXPECTED_POLKADOOM" "$RULESET_HASH" "$PATCH_DIR" "$WAD" <<'PY'
import hashlib, json, pathlib, sys
out, commit, ruleset, patch_dir, wad = map(pathlib.Path, sys.argv[1:])
patches = [{"name": path.name, "blake2b256": "0x" + hashlib.blake2b(path.read_bytes(), digest_size=32).hexdigest()} for path in sorted(patch_dir.glob("*.patch"))]
metadata = {"format": "jam-doom-native-input/v1", "polkadoomCommit": str(commit), "patches": patches, "wadHash": "0x" + hashlib.blake2b(wad.read_bytes(), digest_size=32).hexdigest(), "rulesetHash": str(ruleset)}
out.write_text(json.dumps(metadata, indent=2) + "\n")
PY

echo "prepared pinned Polkadoom $EXPECTED_POLKADOOM"
