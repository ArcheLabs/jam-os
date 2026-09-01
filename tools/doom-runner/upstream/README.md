# Official DOOM bootstrap inputs

The bootstrap uses the exact revisions in [`../upstream.lock`](../upstream.lock).
`scripts/fetch-upstream-artifacts.sh` downloads the official PolkaVM example
program, shareware WAD, and license into this directory and verifies their
BLAKE2b-256 digests against `checksums.blake2b`.

The files are intentionally fetched rather than silently substituted with the
legacy MiniJAM simulation artifact. The WAD is the shareware release shipped by
the upstream example and must be used under its accompanying license.
