# Deploy artifact closure

The Pages workflow is an artifact publisher. It checks the promoted
`artifacts/computer/stage1/scriptc` bundle, verifies its checksums and
`build.json` code hash, copies `service.blob` to
`public/computer-service.bin`, and then builds the static frontend.

The Computer artifact is produced through the public JamScript build
interface from `services/computer/src/service.ts`. JAM Computer pins the
JamScript and MiniJAM dependency revisions, but does not own the compiler
environment, LLVM distribution, or compiler provenance. Pages consumes the
reviewed artifact and does not compile the historical C fixture or any Doom
executable.

Production Pages configuration is supplied through public GitHub Repository
Variables:

```text
MINIJAM_NODE_RPC_URL
MINIJAM_WORK_RPC_URL
MINIJAM_DEPLOYMENT_RPC_URL
MINIJAM_GENESIS_HASH
```

`scripts/check-production-env.mjs` validates the live contract before the
frontend build and fails closed for missing, local, placeholder, credentialed,
or unsupported endpoints. It never writes or accepts private signing data.

The hosted CI and Pages run IDs, deployment URL, and real MiniJAM canary
results belong in `docs/JAM_COMPUTER_STAGE1_RELEASE_CLOSURE.md` only after
they have actually run.
