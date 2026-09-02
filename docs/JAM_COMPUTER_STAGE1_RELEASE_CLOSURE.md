# JAM Computer Stage-1 Public Preview — Release Closure

This report is deliberately fail-closed. It records repository evidence and
does not claim hosted or production results that were not observed.

## Release

| field | value |
| --- | --- |
| Release | JAM Computer Stage-1 Public Preview |
| Baseline SHA | `82017baaed44f8cbaa8c827a41436f28f8c84334` |
| Closure implementation SHA | `87c2264e0cb03de863713f66bb71761f4dfd4ab7` (builder closure implementation pending commit) |
| Release candidate SHA | `87c2264e0cb03de863713f66bb71761f4dfd4ab7` (baseline candidate before this builder-only change) |
| Merge SHA | `PENDING` |
| Branch | `codex/jam-computer-stage1-release-closure` |
| JamScript | `https://github.com/ArcheLabs/JamScript` @ `927a6307f04bf5098a0546c7032ad5e026278658` |
| MiniJAM client | `https://github.com/ArcheLabs/minijam-client` @ `18de55e175abb1cb40679be2e538644e2387655f` |
| Node | `24.15.0` for canonical ScriptC builds |

## Computer artifact

The only canonical production source is
`services/computer/src/service.ts`. The C file beside it is a historical
protocol fixture and is not in the deployment path.

| field | value |
| --- | --- |
| Service key | `0xb5de71cbd87b48abf62a4289172a5c1506c4638869a00f95e4f9b22ef279aba8` |
| Service instance ID | `0xe26f31f5386ac558846da8bb32925a11e8d76c3386aaf784e572eb50053002a4` |
| Management mode | `immutable` |
| Promoted path | `artifacts/computer/stage1/scriptc/service.blob` |
| Code hash | `0xcf86cc5320d0ea6ba090554c752ac87694716accbb87e2ba505efad5b0bfec44` |

CI rebuilds the service twice and compares every generated file before
promoting it. Pages performs no service compilation; it verifies and copies
the promoted `service.blob`.

## Canonical builder

The host apt reconstruction model is retired. The repository now defines a
Linux/amd64 builder in `toolchains/builder/Dockerfile`, pins the Ubuntu base
digest in `toolchains/builder.lock`, and requires the published GHCR image to
be consumed by immutable digest through `scripts/run-canonical-builder.sh`.
The GHCR image has not been published from this workspace because Docker and
registry publication were unavailable; the lock therefore remains
fail-closed with `digest = "PENDING_PUBLISH"`.

| builder field | value |
| --- | --- |
| Image | `ghcr.io/archelabs/jam-computer-builder` |
| Builder digest | `PENDING_PUBLISH` |
| Base image | `ubuntu:20.04@sha256:c664f8f86ed5a386b0a340d981b8f81714e21a8b9c73f658c4bea56aa179d54a` |
| Dockerfile SHA256 | `dcc01e7442ecf5671430cd9cead4618d7ad01ca0dcd8b56ed70f5442d033d99f` |

## Gates

```text
LOCAL_CANONICAL_TOOLCHAINS=PASS
EXACT_LLVM_TOOLCHAIN=PASS (Ubuntu clang 20.1.8; package and binary checksums locked)
LLVM_DEPENDENCY_CLOSURE=PASS (local Focal closure; hosted compatibility still requires revalidation)
LLVM_HOST_APT_MODEL=RETIRED
LLVM_INTERNAL_IDENTITY=PASS (local locked binaries and shared libraries)
CANONICAL_BUILDER_IMAGE=BLOCKED_EXTERNAL
CANONICAL_BUILDER_DIGEST=BLOCKED_EXTERNAL
CANONICAL_BUILDER_ENV=BLOCKED_EXTERNAL
LOCAL_CONTAINER_BUILD=BLOCKED_DOCKER_RUNTIME
CANONICAL_COMPUTER_SOURCE=PASS
COMPUTER_ARTIFACT_REPRODUCIBILITY=PASS (local canonical rebuild)
COMPUTER_ARTIFACT_PROMOTED=PASS (local canonical rebuild)
NPM_TEST=PASS (24 files / 76 tests)
NPM_BUILD=PASS
STAGE1_GUARD=PASS
RELEASE_GUARD=BLOCKED_BUILDER_DIGEST
CANONICAL_BUILDER_LOCK=FAIL (digest pending GHCR publication)
CANONICAL_BUILDER_DIGEST=FAIL (digest pending GHCR publication)
MAIN_CI=FAIL
CI_RUN=33584087932
CI_BLOCKER=LLVM_DEPENDENCY_CLOSURE
PAGES_BUILD=PENDING_HOSTED_RUN
PAGES_DEPLOY=PENDING_HOSTED_RUN
CLEAN_ROOM_BOOTSTRAP=BLOCKED_EXTERNAL (GitHub clone timed out in this workspace)
DOOM_MAIN_CI_DEPENDENCY=PASS (recursive checkout guard; hosted rerun pending)
HOSTED_ARTIFACT_REPRODUCIBILITY=NOT_REACHED
HOSTED_BUILD_A=NOT_REACHED
HOSTED_BUILD_B=NOT_REACHED
HOSTED_BUILD_A_B_IDENTICAL=NOT_REACHED
CROSS_HOST_REPRODUCIBILITY=NOT_REACHED
```

## Production and smoke

The live endpoints and a dedicated canary signer were not available in this
workspace. No service deployment, read smoke, mutation smoke, finalized-state
verification, or browser smoke is claimed.

```text
PRODUCTION_ENV_CONFIGURATION=BLOCKED_EXTERNAL
Required public variables:
  MINIJAM_NODE_RPC_URL
  MINIJAM_WORK_RPC_URL
  MINIJAM_DEPLOYMENT_RPC_URL
  MINIJAM_GENESIS_HASH

COMPUTER_DEPLOYMENT=BLOCKED
LIVE_READ_SMOKE=BLOCKED
LIVE_MUTATION_SMOKE=BLOCKED
BROWSER_SMOKE=BLOCKED
PAGES_URL=NOT_OBSERVED
CI_RUN=33584087932
DEPLOY_RUN=NOT_OBSERVED
```

The mutation smoke is implemented in `scripts/smoke-live.mjs` and uses the
formal JamScript Work client with `SplitRpcTransport`: Node/state queries use
the Node endpoint while `minijam_submitWorkV1` and
`minijam_getWorkStatusV1` use the independent Work endpoint. It requires a dedicated authorized canary signer
through `SMOKE_ACCOUNT_PUBLIC_KEY` and `SMOKE_SIGNER_COMMAND`; it never bypasses
service ownership checks.

## Doom

```text
DOOM_PRODUCT_STATUS=DEFERRED_UPSTREAM_COREVM
DOOM_RELEASE_DEPENDENCY=REMOVED
COREVM_DUPLICATE_IMPLEMENTATION=NOT_PLANNED
```

Research assets remain available under `services/doom` and
`tools/doom-runner`. They run only from the manually dispatched `DOOM Research`
workflow.

## Release decision

```text
JAM_COMPUTER_RELEASE_READY=BLOCKED
```

The release remains blocked until hosted Pages deployment and real MiniJAM
canary read, mutation, finality, and browser checks are recorded.
