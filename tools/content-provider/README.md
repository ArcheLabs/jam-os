# Persistent ContentProvider

This small production adapter implements the Stage-1 content boundary with a
persistent filesystem volume:

```text
PUT  /content/<64-hex-blake2b-256-root>
GET  /content/<root>
HEAD /content/<root>
GET  /health/ready
```

Uploads require `Authorization: Bearer $CONTENT_UPLOAD_TOKEN`. The server
rejects unknown tokens, hash mismatches, objects larger than
`CONTENT_MAX_BYTES` (5 MiB by default), and uploads when no token is configured.
Objects are sharded by the first two root characters and written atomically.
Reads independently re-check the stored hash before returning bytes.

Example:

```bash
CONTENT_VOLUME=/var/lib/jam-content \
CONTENT_UPLOAD_TOKEN=replace-me \
node tools/content-provider/server.mjs
```
