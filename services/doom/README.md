# DOOM Service

This is the Phase 3B deterministic DOOM Service. It is an ordinary MiniJAM
Service: the browser sends versioned JSON requests as Work payloads, `refine`
returns the payload, and `accumulate` applies the request to finalized Service
storage.

State is stored under:

```text
doom:session:<id>:meta
doom:session:<id>:inputs
doom:session:<id>:state
doom:session:<id>:result
```

Build it with the MiniJAM compiler API:

```bash
../minijam-client/scripts/compile-service c services/doom/src/service.c /tmp/jam-doom O0
```

The generated blob and code hash are deployment artifacts. Configure the
deployed service ID as `VITE_DOOM_SERVICE_ID`; DOOM state is never stored in
browser local storage.
