# JAM Computer protocols

## JAM FS

Paths are UTF-8, absolute, `/`-separated, normalized, and reject traversal above root. The client exposes `stat`, `list`, `read`, `write`, `mkdir`, `remove`, and `rename`. Writes happen on explicit save/command actions rather than every editor keystroke.

## JAM Web

`jam://name/path` resolves a name through the configured JNS service, then reads a published snapshot from the resolved service. `jam://service/<id>/path` bypasses JNS. `site publish` creates the snapshot; it does not silently publish edits.

## JNS

The V0 record is `name -> service_id`, with owner authorization for `claim` and `bind`. It is not DNS and has no pricing, expiry, auction, or subdomain semantics.

## Playground

The live adapter maps to the existing MiniJAM Playground API: `/build`, `/services`, and `/work`. Signing details and the current Service ABI stay behind adapters so apps never call raw endpoints.
