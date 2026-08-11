# JAM Computer protocols

## JAM FS

Paths are UTF-8, absolute, `/`-separated, normalized, reject NUL/traversal above root, and are limited to 512 bytes with 128-byte components. The client exposes `stat`, `list`, `read`, `write`, `mkdir`, `remove`, and `rename`. Writes happen on explicit save/command actions rather than every editor keystroke. New requests carry `{v: 1, op, ...}` and binary file contents use base64.

## JAM Web

`jam://name/path` resolves a name through the configured JNS service, then creates a read-only filesystem for the resolved service before reading its published snapshot. `jam://service/<id>/path` bypasses JNS. `jam://name` and trailing directory paths select `index.html`; if no default page exists, only a generated published-directory view is shown. `site publish` creates the snapshot; it does not silently publish edits.

## JNS

The V0 record is `name -> service_id`, with owner authorization for `claim` and `bind`. It is not DNS and has no pricing, expiry, auction, or subdomain semantics.

## Playground

The live adapter maps to the existing MiniJAM Playground API: `/build`, `/services`, and `/work`. Signing details and the current Service ABI stay behind adapters so apps never call raw endpoints.
