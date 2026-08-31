#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT="$ROOT_DIR/../../artifacts/doom/stage1/doom.polkavm"
METADATA="$ROOT_DIR/../../artifacts/doom/stage1/build.json"
RULESET="$ROOT_DIR/../../artifacts/doom/stage1/ruleset.json"
UPSTREAM="$ROOT_DIR/upstream/roms/doom.polkavm"
POLKATOOL_BIN="${POLKATOOL_BIN:-polkatool}"

test -s "$ARTIFACT" || { echo "missing patched guest: $ARTIFACT" >&2; exit 1; }
test -s "$METADATA" || { echo "missing build metadata: $METADATA" >&2; exit 1; }
test -s "$RULESET" || { echo "missing ruleset metadata: $RULESET" >&2; exit 1; }
command -v "$POLKATOOL_BIN" >/dev/null || { echo "missing polkatool; set POLKATOOL_BIN to the pinned build" >&2; exit 1; }
EXPORTS="$($POLKATOOL_BIN disassemble "$ARTIFACT")"
grep -q "export #[^:]*: 'ext_run_status'" <<<"$EXPORTS" || { echo "missing ext_run_status export" >&2; exit 1; }
grep -q "export #[^:]*: 'ext_run_tics'" <<<"$EXPORTS" || { echo "missing ext_run_tics export" >&2; exit 1; }
echo "EXPORTS=PASS (ext_run_status, ext_run_tics)"
python3 - "$ARTIFACT" "$UPSTREAM" "$METADATA" "$ROOT_DIR/upstream/roms/doom1.wad" <<'PY'
import hashlib
import json
import pathlib
import sys

artifact, upstream, metadata, wad = map(pathlib.Path, sys.argv[1:])
data = json.loads(metadata.read_text())
guest_hash = hashlib.blake2b(artifact.read_bytes(), digest_size=32).hexdigest()
upstream_hash = hashlib.blake2b(upstream.read_bytes(), digest_size=32).hexdigest()
wad_hash = hashlib.blake2b(wad.read_bytes(), digest_size=32).hexdigest()
if wad_hash != "b1efef593aae01511b5e5359263a4d6fc0f7b5bb8248e17ec090fef11d9fbe68":
    raise SystemExit(f"unexpected doom1.wad hash: {wad_hash}")
if data.get("wadHash") != wad_hash:
    raise SystemExit("WAD hash does not match build metadata")
if guest_hash != data["guestHash"]:
    raise SystemExit("patched guest hash does not match build.json")
if guest_hash == upstream_hash:
    raise SystemExit("PATCHED_GUEST_NOT_APPLIED")
print(f"guestHash={guest_hash}")
print(f"upstreamGuestHash={upstream_hash}")
print("UPSTREAM_HASH_DIFFERS=PASS")
ruleset = json.loads(metadata.parent.joinpath("ruleset.json").read_text())
payload = (b"JAM_DOOM_RULESET_V1" + bytes.fromhex(guest_hash) + bytes.fromhex(ruleset["wadHash"])
           + bytes((ruleset["episode"], ruleset["map"], ruleset["skill"]))
           + (1).to_bytes(4, "little") + (1).to_bytes(4, "little"))
actual_ruleset = hashlib.blake2b(payload, digest_size=32).hexdigest()
if actual_ruleset != ruleset["rulesetHash"]:
    raise SystemExit("ruleset hash does not match deterministic encoding")
print(f"rulesetHash={actual_ruleset}")
print("DOOM_RULESET_V1=PASS")
PY
