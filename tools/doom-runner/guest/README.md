# Reproducible patched Polkadoom guest

This directory defines the M2 guest build. It clones the exact Polkadoom and
PolkaVM revisions in [`../upstream.lock`](../upstream.lock), verifies a clean
checkout, applies [`polkadoom-run-v1.patch`](./polkadoom-run-v1.patch), builds
the RV32E guest, and links it with `polkatool` built from the pinned PolkaVM
revision.

The canonical Linux build is:

```sh
tools/doom-runner/guest/build.sh
tools/doom-runner/guest/verify.sh
```

When the host compiler does not support RV32E, build the same script in the
provided Ubuntu 24.04 / Clang 18 image:

```sh
docker build -f tools/doom-runner/guest/Dockerfile.build -t jam-os-doom-m2-builder .
```

The build writes `artifacts/doom/stage1/doom.polkavm`, `build.json`, and
`checksums.json` plus a deterministic `ruleset.json`. It uses the immutable M1 WAD and never overwrites the
official artifact under `tools/doom-runner/upstream/roms`.
