# JNS ABI Closure Report

## Canonical inputs

- jam-os branch: `preview/jam-os-desktop`
- JamScript lock and checkout: `927a6307f04bf5098a0546c7032ad5e026278658`
- ABI version: `1`
- generator: pinned checkout under `.toolchain/JamScript`

## Representation provenance

The pinned JamScript ABI model has always serialized `AbiTypeDescriptor` as a
tagged JSON object (`#[serde(tag = "kind")]`), so unit is canonically:

```json
{"kind":"unit"}
```

JamScript commit `25eeabb9e02ab5e77c32f66eb36feab8653ef2d9` hardened this
descriptor model without changing the ABI version. The jam-os commit
`499a250abe1257bf212e453e64f946bf2e4cdddc` manually changed the JNS action
snapshot from an object to the string `"unit"` when the actions became
side-effect-only. That was snapshot drift, not a JamScript ABI schema change.

The canonical snapshot has therefore been regenerated. The only semantic
changes are the two `claim`/`bind` `executeOutput` values:

```diff
- "executeOutput": "unit"
+ "executeOutput": { "kind": "unit" }
```

No ABI version bump is required.

## Validation

- `scripts/check-jamscript-pin.sh /home/libingjiang/JamScript`: PASS
- repeated canonical generation with `cargo run --quiet --locked`: byte-identical
- committed `services/jns/abi/service.abi.json`: matches canonical output
- JNS consumers: PASS; no consumer relies on string-form `executeOutput`
- CI diff gate: preserved and now calls `scripts/check-jns-abi.sh`

Local application gates remain green: 24 test files / 76 tests, production
build, and Stage-1 guard. GitHub Actions must still run once on the pushed
revision to record the hosted result.

```text
CANONICAL_JAMSCRIPT_PIN=PASS
PUBLIC_TOOLCHAIN_CHECKOUT=PASS
JNS_ABI_VERSION=1
JNS_ABI_GENERATION=PASS
JNS_ABI_DETERMINISM=PASS
JNS_ABI_SNAPSHOT=PASS
JNS_ABI_CONSUMER_COMPATIBILITY=PASS
GITHUB_CI_JNS_GATE=PENDING_HOSTED_RUN
```
