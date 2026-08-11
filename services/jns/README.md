# JNS Service

JNS is the small `name -> service_id` mapping used by `jam://` URLs. Names are lowercase ASCII labels validated by `src/jam/names.ts`. The live service ID is configured with `VITE_JNS_SERVICE_ID`; mock mode keeps an isolated in-memory/persisted simulation.
