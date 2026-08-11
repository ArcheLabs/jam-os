# JNS Service

JNS is the small `name -> service_id` mapping used by `jam://` URLs. Names are lowercase ASCII labels validated by `src/jam/names.ts`. The live service ID is configured with `VITE_JNS_SERVICE_ID`; mock mode keeps an isolated in-memory/persisted simulation.

`src/service.c` is compiled against the pinned MiniJAM SDK and stores records under `jns:<name>`. The current Playground API authorizes Work against a Service controller; deployment environments that need per-user claim authorization must enforce that policy in the deployed JNS Service or its canonical system path rather than trusting browser UI checks.
