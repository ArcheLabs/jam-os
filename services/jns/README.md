# JNS

JNS is JAM OS's canonical `jam://` name registry. The Service is implemented
in JamScript and owned by this repository.

Names are canonical lowercase ASCII labels of 3–32 bytes using `a-z`, `0-9`,
and interior hyphens. The Service validates names again and never normalizes
on-chain input.

State:

```text
name -> { owner, serviceId }
```

Actions are `claim` and `bind`; the query is `resolve`. Ownership comes only
from `ctx.sender` and is never trusted from browser input. The canonical state
schema is `jns.names/v1`.

The JamScript toolchain is pinned in `toolchains/jamscript.lock`. The generated
ABI is committed at `services/jns/abi/service.abi.json` and CI checks it for
drift. Live resolution uses the proof-backed JamScript client when
`VITE_JNS_SERVICE_ID`, `VITE_JNS_SERVICE_CODE_HASH`,
`VITE_MINIJAM_GENESIS_HASH`, and `VITE_MINIJAM_RPC_URL` identify a manually
promoted canonical deployment; otherwise the runtime stays disabled.
