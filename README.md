# JAM Computer

**A computer that runs on JAM.**

JAM Computer is a small static browser workstation for MiniJAM. The screen and window manager run locally, while files, published pages, names, and service interactions are accessed through JAM adapters.

## Mock mode

```bash
npm install
npm run dev
```

The default `VITE_JAM_MODE=mock` mode is fully usable without a testnet and is used by CI.

## Live deployment

Production GitHub Pages deployment is self-contained and does not require GitHub Repository Variables.

`.github/workflows/deploy-pages.yml` pins the public MiniJAM Playground API URL, network label, and Computer Service gas limits directly in the repository. During every Pages deployment, the workflow compiles `services/computer/src/service.c` through the live Playground API, writes the reviewed result to `computer-service.bin`, injects the returned Blake2-256 code hash into the frontend build, and verifies that the artifact is present in the final `dist` output.

The live client still fails closed: it verifies the downloaded Computer Service artifact hash before deployment and verifies the deployed Service controller/code hash before reuse. Genesis identity is read from the Playground `/config` endpoint. JNS is now owned here as a downstream JamScript application, but live use remains disabled until the typed runtime bridge and a complete canonical deployment descriptor are intentionally promoted.

Phase 3B adds the ordinary MiniJAM DOOM Service in `services/doom`. Its
versioned requests are submitted through the existing Work path and its
recoverable state is read from finalized `doom:session:<id>:*` storage. Set the
deployed service ID through the `MINIJAM_DOOM_SERVICE_ID` Pages variable; an
unset value keeps the Live DOOM adapter unavailable.

Phase 3C adds a separate realtime path. Preview sessions run locally at 30 FPS
with deterministic Canvas frames and input buffering. Live sessions use the
same frame/input contract over a WebSocket gateway configured with
`MINIJAM_DOOM_GATEWAY_URL`; the gateway relays messages but does not author
game state. Checkpoints still use the verified MiniJAM path.

A Polkadot wallet extension with an sr25519 account is required for state-changing live operations.

Run the non-mutating live smoke check with `VITE_SMOKE_COMPUTER_SERVICE_ID` when testing an existing Computer Service:

```bash
VITE_JAM_MODE=live VITE_PLAYGROUND_API_URL=https://playground.minijam.xyz/api/v1 \
VITE_SMOKE_COMPUTER_SERVICE_ID=<service-id> npm run smoke:live
```

## First demo

1. Sign in with Polkadot and let JAM Computer create or reconnect to your Computer Service.
2. The Terminal opens automatically. Run `ls` and inspect the initialized filesystem.
3. Open **My Computer** to browse files stored through the Computer Service.
4. Open **Playground** to compile, deploy, and interact with MiniJAM services.
5. Open **Browser** for `file://` pages and, once JNS is promoted, `jam://` names.

The Browser also supports best-effort ordinary HTTP(S) iframe navigation. Sites that disallow embedding can be opened in the system browser; no proxy is used.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PROTOCOL.md](docs/PROTOCOL.md). The implementation has no jam-os backend, database, proxy, AI agent, or client-only DOOM claim.

## What runs where?

Local browser: pixels, windows, keyboard/mouse input, Monaco, xterm, browser history, and ephemeral window state.

MiniJAM: Computer Service state, files, published site snapshots, JNS records when enabled, and Service execution.

MiniJAM Playground infrastructure: C/C++ compilation, Service deployment, and Work submission.

Traditional jam-os backend: none.

## Development

```bash
npm test
npm run build
```

## License

MIT. See [LICENSE](LICENSE).
