# JAM Computer Stage-1 Public Preview — Release Closure

This report records application-level release evidence. JAM Computer owns the
Computer Service source, its consumed artifact, and deployment identity.
JamScript owns the language implementation, compiler environment, artifact
generation, and compiler determinism.

## Release

| field | value |
| --- | --- |
| Release | JAM Computer Stage-1 Public Preview |
| Branch | `codex/jam-os-modern-ui` |
| JamScript | `https://github.com/ArcheLabs/JamScript` @ `927a6307f04bf5098a0546c7032ad5e026278658` |
| MiniJAM client | `https://github.com/ArcheLabs/minijam-client` @ `18de55e175abb1cb40679be2e538644e2387655f` |

## Computer application

The production Computer Service source is
`services/computer/src/service.ts`. The adjacent `service.c` file is a
historical protocol fixture and is not deployed.

The reviewed artifact is stored under
`artifacts/computer/stage1/scriptc/`. JAM Computer validates its required
files, checksums, application ABI surface, immutable Service identity, and
Blake2-256 code hash before deployment.

```text
COMPUTER_SERVICE_CHECK=PASS
COMPUTER_ARTIFACT_VERIFY=PASS
COMPUTER_ARTIFACT_CODE_HASH=0xcf86cc5320d0ea6ba090554c752ac87694716accbb87e2ba505efad5b0bfec44
```

The application build path invokes JamScript's public `check` and `build`
commands. It does not define or verify the compiler's internal environment.

## Gates

```text
NPM_TEST=PASS (25 files / 79 tests)
NPM_BUILD=PASS
STAGE1_GUARD=PASS
RELEASE_GUARD=PASS
MAIN_CI=PENDING_HOSTED_RUN
PAGES_BUILD=PENDING_HOSTED_RUN
PAGES_DEPLOY=PENDING_HOSTED_RUN
```

## Production and smoke

Live endpoints and a dedicated canary signer are not recorded in this
workspace. No deployment or live smoke result is claimed here.

```text
PRODUCTION_ENV_CONFIGURATION=BLOCKED_EXTERNAL
COMPUTER_DEPLOYMENT=BLOCKED
LIVE_READ_SMOKE=BLOCKED
LIVE_MUTATION_SMOKE=BLOCKED
BROWSER_SMOKE=BLOCKED
```

The live client continues to verify the downloaded artifact and finalized
Service code hash. Node/state reads, Formal Work submission, and deployment
remain separate typed adapters.

## Doom

DOOM remains deferred pending the official JAM CoreVM. Its research assets are
outside the Stage-1 product and deployment path.

## Release decision

```text
JAM_COMPUTER_RELEASE_READY=BLOCKED
```

The application boundary is complete; release readiness still depends on the
external deployment and live-network checks above.
