# JAM Computer

**A computer that runs on JAM.**

JAM Computer is a small static browser workstation for MiniJAM. The screen and window manager run locally, while files, published pages, names, and service interactions are accessed through JAM adapters.

## Run locally

```bash
npm install
npm run dev
```

The default `VITE_JAM_MODE=mock` mode is fully usable without a testnet. Copy `.env.example` to `.env` to configure live-mode endpoints. Live mode deliberately fails visibly until the current MiniJAM Service ABI and wallet flow are configured in the adapters.

## First demo

1. Open Settings and choose **Create Computer**.
2. Open Terminal and run `ls`.
3. Run `name claim alice`, then `site publish ~/Sites/home`.
4. Run `browser jam://alice`.

The same Browser handles native `jam://` pages, JAM FS `file://` pages, and best-effort ordinary HTTP(S) iframe navigation. Sites that disallow embedding can be opened in the system browser; no proxy is used.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PROTOCOL.md](docs/PROTOCOL.md). The implementation has no jam-os backend, database, proxy, AI agent, or client-only DOOM claim.

## Development

```bash
npm test
npm run build
```

## License

MIT. See [LICENSE](LICENSE).
