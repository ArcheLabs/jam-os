# DOOM-inspired Simulation Service

This is a deterministic, DOOM-inspired protocol simulation implemented as an
ordinary MiniJAM Service. It is not the original DOOM game: it does not embed a
DOOM engine, WAD files, original maps, enemy AI, or game assets. The browser
sends versioned JSON requests as Work payloads, `refine` returns the payload,
and `accumulate` applies the request to finalized Service storage.

State is stored under:

```text
doom:session:<id>:meta
doom:session:<id>:inputs
doom:session:<id>:state
doom:session:<id>:result
doom:best:<account>
```

Every request currently carries a wallet account from the browser payload. The
Service binds that value when the session is created, rejects later requests
with a different value, and stores that account's highest completed result.
This is only safe behind the Stage 0 trusted-relayer identity model. Stage 1
direct node ingress must authenticate the same principal in the chain protocol
before scores can be treated as authoritative; a browser-supplied account alone
is not proof of identity.

Build it with the MiniJAM compiler API:

```bash
../minijam-client/scripts/compile-service c services/doom/src/service.c /tmp/jam-doom O0
```

The generated blob and code hash are deployment artifacts. Configure the
deployed service ID as `VITE_DOOM_SERVICE_ID`; DOOM state is never stored in
browser local storage.
