# DOOM native integration provenance

The native integration inputs use Polkadoom from:

- Repository: https://github.com/koute/polkadoom
- Pinned commit: `cc68c85c172fd3d30a5561250f027640ac4e099e`
- License: GPLv2+

The pinned upstream source is retained as a git submodule under
`native/doom/upstream/polkadoom`. Its `README` and license files, together
with the license and notice files under `libs/`, remain part of the source
provenance. The generated build input is produced by
`scripts/prepare-native-doom.sh`; review project-level obligations before
distributing statically linked binaries. The generated patched copy is
`native/doom/generated/polkadoom` and is reproducible from the pin and patches.
