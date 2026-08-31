# Computer Service

This directory contains the canonical Computer Service boundary used by JAM Computer. Production metadata is implemented in `src/service.ts` with the pinned JamScript 0.2 toolchain. The browser client sends typed actions through `JamClient`; it does not contain a server or database.

The JamScript state schema is split into `computer.profile/v1`, `computer.appearance/v1`, `computer.desktop-icons/v1`, `computer.nodes/v1`, and `computer.site-manifest/v1`. Only bounded metadata and content references are stored on-chain. Public reads use finalized service state; mutations are wallet-authorized and always compare `ctx.sender` with the immutable owner recorded by `initialize`. File bytes and artwork are supplied by the content-addressed provider in `src/jam/contentProvider.ts`.

For local artifact validation from a checkout that also contains `minijam-client`:

```bash
../JamScript/target/debug/jamscript check services/computer
../JamScript/target/debug/jamscript build services/computer --output artifacts/computer/stage1/scriptc
```

`src/service.c` is retained as a historical protocol fixture only; it is not the production Computer implementation. Keep generated blobs out of source control unless they are intentionally promoted as reviewed canonical artifacts.

The reviewed Stage-1 ScriptC artifact is promoted under `artifacts/computer/stage1/scriptc/` with code hash
`0x375532e134f651d46350a3a66d6206841a1677fa696354310f7f070d113fb895`.
