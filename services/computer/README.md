# Computer Service

This directory contains the canonical Computer Service boundary used by JAM Computer. Production metadata is implemented in `src/service.ts` with the pinned JamScript 0.2 toolchain. The browser client sends typed actions through `JamClient`; it does not contain a server or database.

The JamScript state schema is split into `computer.profile/v1`, `computer.appearance/v1`, `computer.desktop-icons/v1`, `computer.nodes/v1`, and `computer.site-manifest/v1`. Only bounded metadata and content references are stored on-chain. Public reads use finalized service state; mutations are wallet-authorized and always compare `ctx.sender` with the immutable owner recorded by `initialize`. File bytes and artwork are supplied by the content-addressed provider in `src/jam/contentProvider.ts`.

The only production Computer source is `src/service.ts`. `src/service.c` is a
historical protocol fixture and must not be used to make a release artifact.

For local artifact validation after bootstrapping the locked toolchains:

```bash
npm run computer:artifact:check
```

`npm run computer:artifact:build` writes a fresh artifact to a temporary
directory. `npm run computer:artifact:promote` is the explicit operation that
rebuilds twice, proves byte identity, and replaces the reviewed artifact.

The reviewed Stage-1 ScriptC artifact is promoted under
`artifacts/computer/stage1/scriptc/`. Its code hash and toolchain revisions
are recorded in the accompanying `build.json`; never update those values by
hand.

DOOM is deferred pending official JAM CoreVM. MiniJAM will not implement a
duplicate CoreVM runtime; the existing Polkadoom work is retained as a future
CoreVM compatibility fixture.
