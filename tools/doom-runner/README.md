# Real DOOM Runner boundary

The live browser runtime talks to this runner over one WebSocket per `Run`.
The runner owns one long-lived PolkaVM instance, applies tick-indexed input,
streams the upstream framebuffer, records `DoomReplayV1`, and finalizes only a
completed E1M1 run. It never submits per-frame or per-input MiniJAM Work and it
has no blockchain session state.

The pinned PolkaVM/Polkadoom sources and guest artifact must be supplied before
enabling readiness. Until those upstream artifacts are present, live DOOM is
explicitly unavailable; the browser does not fall back to the simulation
runtime.
