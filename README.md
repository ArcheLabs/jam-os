# JAM Computer

**A computer that runs on JAM.**

JAM Computer is a small static browser workstation for MiniJAM. The screen and window manager run locally, while files, published pages, names, and service interactions are accessed through JAM adapters.

## Mock mode

```bash
npm install
npm run dev
```

The default `VITE_JAM_MODE=mock` mode is fully usable without a testnet and is used by CI.

## Stage-1 Public Preview

The release path is fail-closed and uses the reviewed artifact produced from
`services/computer/src/service.ts` by the pinned JamScript and MiniJAM
toolchains. CI rebuilds and compares that artifact; GitHub Pages only copies
`artifacts/computer/stage1/scriptc/service.blob` to the site. The historical
`services/computer/src/service.c` fixture is never deployed.

Pages requires repository Variables for `MINIJAM_NODE_RPC_URL`,
`MINIJAM_WORK_RPC_URL`, `MINIJAM_DEPLOYMENT_RPC_URL`, and
`MINIJAM_GENESIS_HASH`. These are public network endpoints and identity data;
signing keys and other secrets must remain outside this repository.

The live client verifies the downloaded Computer artifact and the finalized
service code hash before use. The browser uses the neutral Node RPC, Formal
Work RPC, and deployment ingress directly. `npm run smoke:live:read` performs
the read gate; `npm run smoke:live:write` performs the authorized mutation gate
when supplied with a dedicated canary signer.

DOOM is deferred pending the official JAM CoreVM. Its research source and
provenance remain in the repository, but it is hidden from the Stage-1 product
registry and is not a release dependency.

A Polkadot wallet extension with an sr25519 account is required for state-changing live operations.

Run the read smoke against a deployed canary Computer Service:

```bash
VITE_JAM_MODE=live \
VITE_MINIJAM_NODE_RPC_URL=https://node.example.invalid \
VITE_MINIJAM_WORK_RPC_URL=https://work.example.invalid \
VITE_MINIJAM_DEPLOYMENT_RPC_URL=https://deploy.example.invalid \
VITE_MINIJAM_GENESIS_HASH=0x<genesis-hash> \
VITE_COMPUTER_SERVICE_CODE_HASH=0x<code-hash> \
VITE_SMOKE_COMPUTER_SERVICE_ID=<service-id> npm run smoke:live:read
```

## First demo

1. Sign in with Polkadot and let JAM Computer create or reconnect to your Computer Service.
2. The Terminal opens automatically. Run `ls` and inspect the initialized filesystem.
3. Open **My Computer** to browse files stored through the Computer Service.
4. Open **Playground** to compile, deploy, and interact with MiniJAM services.
5. Open **Browser** for `file://` pages and, once JNS is promoted, `jam://` names.

The Browser also supports best-effort ordinary HTTP(S) iframe navigation. Sites that disallow embedding can be opened in the system browser; no proxy is used.

## Architecture

The Stage-1 production path composes the neutral MiniJAM node, Formal Work,
state, and deployment RPCs. Playground is a legacy Stage-0 product and is not
a runtime or build dependency. The Computer artifact is compiled by CI with
the pinned local MiniJAM toolchain and promoted as a reviewed release input.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PROTOCOL.md](docs/PROTOCOL.md). The implementation has no jam-os backend, database, proxy, AI agent, or client-only DOOM claim.

## What runs where?

Local browser: pixels, windows, keyboard/mouse input, Monaco, xterm, browser history, and ephemeral window state.

MiniJAM: Computer Service state, files, published site snapshots, JNS records when enabled, and Service execution.

MiniJAM: Service deployment, Formal Work submission, and finalized state.

Traditional jam-os backend: none.

## Development

```bash
npm test
npm run build
```

## License

MIT. See [LICENSE](LICENSE).
