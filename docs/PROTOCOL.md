# JAM Computer protocols

## JAM FS

Paths are UTF-8, absolute, `/`-separated, normalized, reject NUL/traversal above root, and are limited to 512 bytes with 128-byte components. The client exposes `stat`, `list`, `read`, `write`, `mkdir`, `remove`, and `rename`. Writes happen on explicit save/command actions rather than every editor keystroke. New requests carry `{v: 1, op, ...}` and binary file contents use base64.

## JAM Web

`jam://name/path` resolves a name through the configured JNS service, then creates a read-only filesystem for the resolved service before reading its published snapshot. `jam://service/<id>/path` bypasses JNS. `jam://name` and trailing directory paths select `index.html`; if no default page exists, only a generated published-directory view is shown. `site publish` creates the snapshot; it does not silently publish edits.

## JNS

JNS is a JamScript application with canonical ABI version 1. Names are
lowercase ASCII byte labels of 3–32 bytes. Its Managed State schema is
`jns.names/v1`:

```text
bytes(32) -> { owner: address, serviceId: u32 }
```

Wallet-authenticated `claim` and `bind` actions use SignedActionV2; ownership
is derived exclusively from `ctx.sender`. `resolve` is a typed, proof-backed
state query. The old JSON operations (`jns:claim`, `jns:bind`, `jns:resolve`)
and raw `jns:<name>` Service storage belong to the deprecated test Service and
are not the canonical JNS protocol.

Live use remains disabled until JamScript's generic typed ScriptC runtime/state
bridge is released and a deployment descriptor is manually promoted. JNS is
not DNS and has no pricing, expiry, auction, or subdomain semantics.

## Playground

The live adapter maps to the existing MiniJAM Playground API: `/build`, `/services`, and `/work`. Signing details and the current Service ABI stay behind adapters so apps never call raw endpoints.
