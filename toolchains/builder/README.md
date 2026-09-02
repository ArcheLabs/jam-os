# Canonical Computer builder

This directory defines the Linux/amd64 OCI environment for the canonical
Computer artifact. The base image is pinned by digest, LLVM packages are
installed at the exact versions in `toolchains/llvm.lock`, Node is downloaded
with a pinned archive checksum, and Rust uses the exact dated nightly channel.

The published image reference and digest are intentionally not invented in
this checkout. `toolchains/builder.lock` remains fail-closed until the image
has been built, validated, published to GHCR, and its immutable digest has
been committed there.

The image must be consumed through `scripts/run-canonical-builder.sh`. Host
compiler binaries are never accepted as a fallback. The container receives
the locked JamScript and MiniJAM checkouts through the mounted repository.
