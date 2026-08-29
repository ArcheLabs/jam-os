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
drift. No deployment descriptor exists yet: live JNS remains disabled until
the generic ScriptC typed runtime/state bridge is complete and a canonical
MiniJAM deployment is manually promoted.
