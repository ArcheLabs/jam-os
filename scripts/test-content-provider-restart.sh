#!/usr/bin/env bash
set -euo pipefail

name="jam-content-provider-smoke-$$"
volume="jam-content-provider-volume-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true; docker volume rm "$volume" >/dev/null 2>&1 || true' EXIT
docker volume create "$volume" >/dev/null
docker build -q -t jam-os-content-provider:smoke -f tools/content-provider/Dockerfile . >/dev/null
docker run -d --name "$name" -p 18787:8787 -e CONTENT_UPLOAD_TOKEN=smoke-token -e CONTENT_AUTH_MODE=test-token -v "$volume:/var/lib/jam-content" jam-os-content-provider:smoke >/dev/null
for _ in $(seq 1 30); do curl -fsS http://127.0.0.1:18787/health/ready >/dev/null && break; sleep 1; done
payload="stage1-content-provider-smoke"
root="$(PAYLOAD="$payload" python3 -c 'import hashlib, os; print(hashlib.blake2b(os.environ["PAYLOAD"].encode(), digest_size=32).hexdigest(), end="")')"
printf '%s' "$payload" | curl -fsS -X PUT -H 'Authorization: Bearer smoke-token' --data-binary @- "http://127.0.0.1:18787/content/$root" >/dev/null
docker restart "$name" >/dev/null
sleep 1
test "$(curl -fsS "http://127.0.0.1:18787/content/$root")" = "$payload"
echo "ContentProvider restart persistence: PASS"
