# Deploy Toolchain Closure Report

## Canonical inputs

- jam-os branch: `preview/jam-os-desktop`
- JamScript: `https://github.com/ArcheLabs/JamScript`
- JamScript revision: `927a6307f04bf5098a0546c7032ad5e026278658`
- MiniJAM client: `https://github.com/ArcheLabs/minijam-client`
- MiniJAM client revision: `18de55e175abb1cb40679be2e538644e2387655f`
- Node: `22.x` for Deploy Pages; CI pins ScriptC M2 to `24.15.0`

Both workflow checkouts now use the same lock files through the shared
`.github/actions/bootstrap-toolchains` action. Local development can use
`npm run toolchain:bootstrap`, while `--verify-only` checks an already prepared
workspace without changing it.

The CI native build passes the MiniJAM client checkout root to
`JAMSCRIPT_MINIJAM_SDK`; the pinned JamScript target appends its
`service-toolchain/sdk` and converter paths itself.

CI also installs the pinned ScriptC M2 npm toolchain before the native gate and
checks Node, SDK, ScriptC runtime, and LLVM 20 explicitly so a missing native
dependency reports a direct prerequisite failure.

Before the PolkaVM guest link, CI installs `rust-src` for the pinned nightly and
prefetches the Rust sysroot dependency graph. The guest build itself remains
offline and locked, but no longer depends on an empty runner-side Cargo cache.

## Local validation

The canonical layout and pin checks pass, followed by a clean-toolchain client
build, the 24-file/76-test canonical suite, production build, and Stage-1 guard.
The Deploy workflow installs dependencies only after both file dependencies are
present, eliminating the previous JamScript client `ENOENT` failure.

```text
TOOLCHAIN_LAYOUT=PASS
JAMSCRIPT_PIN=PASS
MINIJAM_CLIENT_PIN=PASS
TOOLCHAIN_CLIENT_BUILD=PASS
TEST_BOUNDARY=PASS
NPM_TEST=PASS (24 files / 76 tests)
NPM_BUILD=PASS
STAGE1_GUARD=PASS
```

## Hosted workflow status

The next push will run both hosted gates. Their URLs/run IDs are intentionally
recorded after GitHub reports them; no hosted result is claimed by this local
closure report.

```text
CI_RUN=PENDING_HOSTED_RUN
DEPLOY_RUN=PENDING_HOSTED_RUN
CI_TOOLCHAIN_BOOTSTRAP=READY
DEPLOY_TOOLCHAIN_BOOTSTRAP=READY
```

## DOOM deployment naming

The Pages workflow still emits `doom-service.bin` for frontend compatibility,
but it is now explicitly labeled:

```text
before: Canonical DOOM Service
after:  Legacy DOOM Simulation Service
artifactKind: legacy-doom-simulation
```

This task does not change the native DOOM frontier or claim a real verifier.
