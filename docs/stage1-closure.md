# JAM Computer Stage-1 closure record

This checkout records the reproducible local baseline used for the Stage-1
closure work:

| component | revision |
| --- | --- |
| minijam-client | `37828e00ff2b503ea86e3f70b42c5850b03d022a` |
| JamScript | `660f463a784bf0161d8c5fd8c211dbd10a95e4d2` |
| jam-os | `e23341ffe7b638dac9c05917b23e09d1efa0757a` |
| Jambda (unchanged) | `368584d452e4e5d0eef5a304b9f481bdc8ce2c50` |

The rebuilt Computer artifact is Blake2-256
`0x09d6afa902b7f7efe9fb8099f4cd93013815eb22d941a6e58652108fe9301672`.
Its ABI and source are generated from the checked-in service with JamScript
0.2 ScriptC and the pinned Node 24.15.0 toolchain.

The local unit suite (65 tests), production guard, and Vite build pass. A live
MiniJAM/worker/Formal-RPC deployment and anonymous restart E2E were not run in
this WSL session because Docker integration is unavailable. A short-lived
upload-capability service is still required before enabling authenticated
ContentProvider PUTs in production; no permanent browser token is shipped.

Real PolkaVM DOOM remains intentionally out of scope for Stage-1.
