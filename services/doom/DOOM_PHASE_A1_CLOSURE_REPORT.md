# DOOM Phase A.1 Closure Report

## Baselines

- JamScript canonical lock: `927a6307f04bf5098a0546c7032ad5e026278658`
- JamScript checkout: `927a6307f04bf5098a0546c7032ad5e026278658`
- jam-os: `abc031b` (local and remote)
- Jambda: `368584d452e4e5d0eef5a304b9f481bdc8ce2c50`

## Polkadoom inputs

- repository: `https://github.com/koute/polkadoom`
- pinned commit: `cc68c85c172fd3d30a5561250f027640ac4e099e`
- source mechanism: pinned git submodule plus deterministic offline generated copy
- source: `services/doom/native/doom/upstream/polkadoom`
- generated tree: `services/doom/native/doom/generated/polkadoom`
- preparation: `scripts/prepare-native-doom.sh` (offline, fail-closed pin/WAD checks)
- WAD BLAKE2b-256: `b1efef593aae01511b5e5359263a4d6fc0f7b5bb8248e17ec090fef11d9fbe68`
- ruleset hash: `0x49d65a8cb7ebbd05b9b1d0ef11095a6d924863f45e3afc1488e89b108652d97f`
- patch hashes: `0001=0x26c07445f2a7ca5ca5fac84bd13d2023785ae59464b9d6baa889d747397236f5`, `0002=0xfe4ebd647e1c4e4ecde5bce8bb648f8e12a2fb9523b2cf3e8d0d6849dd064ad2`
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

## Full-engine compile frontier

The fixed manifest contains 85 sources. The reproducer is:

```text
cd services/doom
./scripts/build-native-doom-full.sh
```

It uses the JamScript native backend target and strict flags
(`riscv64-unknown-elf`, `rv64emac`, `lp64e`, `-std=c11`, `-Wall -Wextra -Werror`).
The `am_map.c` initializer and unused-parameter warnings are fixed by
`0002-doomgeneric-strict-c-compat.patch`. The next deterministic first failure
is now in `d_iwad.c`:

```text
error: call to undeclared function 'strdup' [-Werror,-Wimplicit-function-declaration]
error: incompatible integer to pointer conversion returning 'int' from a function with result type 'char *' [-Wint-conversion]
error: comparison of integers of different signs [-Werror,-Wsign-compare]
```

Classification: `LIBC_PORTABILITY` / strict-C compatibility. The compile
frontier is reproducible and no warning suppression or `-Werror` relaxation is
used. Full engine linking remains blocked; no Refine or gameplay result is
claimed.

## CI

GitHub Actions now checks out the canonical JamScript revision and MiniJAM SDK
under `.toolchain/` using the `JAMSCRIPT_REPO_TOKEN` secret, verifies the pin,
runs the test/build/guard gates, prepares Doom inputs, builds the minimal native
link, and asserts the stable full-engine frontier diagnostic. A hosted CI run
is not available from this workspace, so its status remains pending until the
repository workflow executes.

## Status

```text
SCRIPTC_NATIVE_FFI=PASS
NATIVE_WORK_EXTRINSIC=PASS
DOOM_RULESET_V2=PASS
CANONICAL_TOOLCHAIN_PIN=PASS
GITHUB_CI=PENDING
PINNED_POLKADOOM_NATIVE_LINK=PASS
FULL_DOOM_COMPILE_REPRODUCER=PASS
FULL_DOOM_ENGINE_LINK=BLOCKED
CANONICAL_DOOM_REPLAY=PENDING
LOCAL_REPLAY_DETERMINISM=PENDING
DOOM_REFINE_VERIFIER=BLOCKED
RV32_RV64_DOOM_PARITY=PENDING
DOOM_ACCUMULATE_LEADERBOARD=PENDING
CONTENT_REPLAY_STORAGE=PENDING
REPLAY_ROOT_RECOVERY=PENDING
DOOM_END_TO_END=BLOCKED
```
