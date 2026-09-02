# Deploy toolchain closure

The Pages workflow is an artifact publisher. It checks the promoted
`artifacts/computer/stage1/scriptc` bundle, verifies its checksums and
`build.json` code hash, copies `service.blob` to
`public/computer-service.bin`, and then builds the static frontend.

The Computer artifact is rebuilt in CI from
`services/computer/src/service.ts` using the revisions in
`toolchains/jamscript.lock` and `toolchains/minijam-client.lock`. Pages does
not install LLVM, Rust, ScriptC, or the MiniJAM compiler to create a new
service artifact. The historical C fixture and all Doom executables are
outside the release path.

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
