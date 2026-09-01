# DOOM Phase-A Closure Report

## Baselines

- JamScript: `927a6307f04bf5098a0546c7032ad5e026278658` (local and remote)
- jam-os: `5efc918bbe03c186f6d2d16c599b25d3923ace64` (local and remote)
- Jambda: `368584d452e4e5d0eef5a304b9f481bdc8ce2c50`

## Polkadoom inputs

- repository: `https://github.com/koute/polkadoom`
- pinned commit: `cc68c85c172fd3d30a5561250f027640ac4e099e`
- source: `services/doom/native/doom/upstream/polkadoom`
- preparation: `scripts/prepare-native-doom.sh` (offline, fail-closed pin/WAD checks)
- WAD BLAKE2b-256: `b1efef593aae01511b5e5359263a4d6fc0f7b5bb8248e17ec090fef11d9fbe68`
- ruleset hash: `0x49d65a8cb7ebbd05b9b1d0ef11095a6d924863f45e3afc1488e89b108652d97f`
- upstream tree is kept pristine; generated sources are patched copies
- licensing/provenance: `services/doom/THIRD_PARTY.md`

## Native link gate

The minimal JamScript RV64 native module links a real pinned Polkadoom symbol
(`m_fixed.c`) and builds with Node `24.15.0`, clang `20.1.8`, and polkavm-linker
`0.30.0`.

- guest: `riscv64/lp64e`
- service ELF: `818,920` bytes
- service blob: `354,707` bytes
- service PolkaVM: `355,278` bytes
- code hash: `0x3e920b0cfbb580989a72ed3066a69074c0e16ba7f60ec904fcdc30e930ea81ec`

`PINNED_POLKADOOM_NATIVE_LINK=PASS`

## First remaining blocker

The full headless engine cannot yet be compiled as a JamScript native-C module.
The first deterministic diagnostic from a source-complete Doomgeneric attempt is
an upstream `-Werror` failure in `am_map.c`:

```text
error: missing field 'data4' initializer [-Werror,-Wmissing-field-initializers]
error: unused parameter 'colorrange' [-Werror,-Wunused-parameter]
```

Therefore the real `verifyRun` native verifier, Refine execution, parity,
leaderboard, and ContentProvider recovery are intentionally not reported as
passing until a dedicated headless native port resolves this compile boundary.

## Status

```text
SCRIPTC_NATIVE_FFI=PASS
NATIVE_WORK_EXTRINSIC=PASS
DOOM_RULESET_V2=PASS
PINNED_POLKADOOM_NATIVE_LINK=PASS
CANONICAL_DOOM_REPLAY=PENDING
LOCAL_REPLAY_DETERMINISM=PENDING
DOOM_REFINE_VERIFIER=BLOCKED
RV32_RV64_DOOM_PARITY=PENDING
DOOM_ACCUMULATE_LEADERBOARD=PENDING
CONTENT_REPLAY_STORAGE=PENDING
REPLAY_ROOT_RECOVERY=PENDING
DOOM_END_TO_END=BLOCKED
```
