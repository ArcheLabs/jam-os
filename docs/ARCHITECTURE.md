# JAM Computer architecture

JAM Computer is a static React/Vite application. The local browser renders the desktop and windows; persistent computer state and service execution are accessed through typed adapters.

```text
Desktop / apps
├── JamFileSystem / PlaygroundAdapter
│   └── JamClient / AccountAdapter
│       └── MiniJAM Services
└── JamNameService
    └── JnsBackend
        ├── MockJnsBackend
        └── JamScriptJnsBackend
            └── JamScriptClient
                └── JNS Service
                    └── Managed State
```

Window positions, focus, and open windows are ephemeral local UI state. Files, published site manifests, names, and service calls are JAM state. In mock mode those same adapter contracts are backed by an isolated mock client, never by the live path.

The Stage-1 `MiniJamTransport` composes the node JSON-RPC, Formal Work RPC,
neutral deployment RPC, and finalized state reads. It neither compiles source
nor uses Playground identity. Service artifacts are built locally, Work is
submitted with `minijam_submitWorkV1`, and deployment succeeds only after the
finalized ServiceInfo code hash matches the local artifact.

JNS is no longer a JSON operation inside the generic JamClient. `JamNameService`
is the UI-facing facade and delegates to `JnsBackend`. Mock mode uses
`MockJnsBackend`, which models owner and binding rules directly. The live
backend consumes the released `@jamscript/minijam-client` and remains
fail-closed unless the canonical JNS deployment identity and RPC endpoint are
configured. Provider infrastructure is runtime configuration, not part of the
JNS Service identity.

The six V0 apps are registered in `src/App.tsx`. The Browser owns one shared history and routes `jam://`, `file://`, `http://`, `https://`, and `about:` through handlers. JAM/file HTML is sanitized and rendered in a sandboxed iframe; page-authored JavaScript is removed and only the small Browser-owned JAM link bridge is injected.
