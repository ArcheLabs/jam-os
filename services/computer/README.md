# Computer Service

This directory documents the canonical Computer Service boundary used by JAM Computer. The browser client sends the logical operations described in `JAM_OS_IMPLEMENTATION_SPEC.md` through `JamClient`; it does not contain a server or database.

The live adapter freezes the V0.2 storage layout used by the canonical artifact: `meta:protocol`, `fs:node:<path>`, `fs:dir:<path>`, `fs:blob:<content-hash>`, and `site:manifest`. Public reads use finalized service storage; mutations use the existing controller-authorized Playground Work path. The artifact must be built from the MiniJAM SDK and supplied through `VITE_COMPUTER_SERVICE_ARTIFACT_URL` plus its verified Blake2-256 `VITE_COMPUTER_SERVICE_CODE_HASH`.

For local artifact validation from a checkout that also contains `minijam-client`:

```bash
../minijam-client/scripts/compile-service c services/computer/src/service.c /tmp/jam-computer O0
```

The source uses the SDK's allocation-free JSON request envelope and content-addressed file keys. Keep the generated blob out of source control unless it is intentionally promoted as the reviewed canonical artifact.
