# JAM Computer

**A computer that runs on JAM.**

JAM Computer is a small static browser workstation for MiniJAM. The screen and window manager run locally, while files, published pages, names, and service interactions are accessed through JAM adapters.

## Mock mode

```bash
npm install
npm run dev
```

The default `VITE_JAM_MODE=mock` mode is fully usable without a testnet and is used by CI:

```bash
npm install
npm run dev
```

## Live mode

Set `VITE_JAM_MODE=live` and configure `.env` with the current MiniJAM Playground/API URL, JNS Service ID, and the reviewed Computer Service artifact hash and URL. A Polkadot wallet extension with an sr25519 account is required for mutations. Live mode fails closed with a typed error when any of these are missing; it never substitutes mock state.

Run the non-mutating live smoke check with `VITE_SMOKE_COMPUTER_SERVICE_ID`:

```bash
VITE_JAM_MODE=live npm run smoke:live
```

## First demo

1. Open Settings and choose **Create Computer**.
2. Open Terminal and run `ls`.
3. Run `name claim alice`, then `site publish ~/Sites/home`.
4. Run `browser jam://alice`.

The same Browser handles native `jam://` pages, JAM FS `file://` pages, and best-effort ordinary HTTP(S) iframe navigation. Sites that disallow embedding can be opened in the system browser; no proxy is used.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PROTOCOL.md](docs/PROTOCOL.md). The implementation has no jam-os backend, database, proxy, AI agent, or client-only DOOM claim.

## What runs where?

Local browser: pixels, windows, keyboard/mouse input, Monaco, xterm, browser history, and ephemeral window state.

MiniJAM: Computer Service state, files, published site snapshots, JNS records, and Service execution.

MiniJAM Playground infrastructure: C/C++ compilation, Service deployment, and Work submission.

Traditional jam-os backend: none.

## Development

```bash
npm test
npm run build
```

## License

MIT. See [LICENSE](LICENSE).
