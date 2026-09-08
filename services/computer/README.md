# Computer Service

This directory contains the Computer Service boundary used by JAM Computer. Production behavior is implemented in `src/service.ts` and compiled through the public JamScript 0.2 interface. The browser client sends typed actions through `JamClient`; it does not contain a server or database.

The JamScript state schema is split into `computer.profile/v1`, `computer.appearance/v1`, `computer.desktop-icons/v1`, `computer.nodes/v1`, and `computer.site-manifest/v1`. Only bounded metadata and content references are stored on-chain. Public reads use finalized service state; mutations are wallet-authorized and always compare `ctx.sender` with the immutable owner recorded by `initialize`. File bytes and artwork are supplied by the content-addressed provider in `src/jam/contentProvider.ts`.

The only production Computer source is `src/service.ts`. `src/service.c` is a
historical protocol fixture and must not be used to make a release artifact.

To validate the application source and reviewed artifact:

```bash
npm run computer:check
npm run computer:artifact:verify
```

`npm run computer:artifact:build` invokes `jamscript build` once and writes a
fresh application artifact to a temporary directory unless an output path is
provided. Compiler environment and determinism are JamScript responsibilities.

The reviewed Stage-1 artifact is stored under
`artifacts/computer/stage1/scriptc/`. Its `build.json` contains only the
application identity and artifact hashes; never update those values by hand.

DOOM is deferred pending official JAM CoreVM. MiniJAM will not implement a
duplicate CoreVM runtime; the existing Polkadoom work is retained as a future
CoreVM compatibility fixture.
