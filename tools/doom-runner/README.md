# Real DOOM Runner boundary

Stage 1 starts with the upstream PolkaVM example. The source revisions are
locked in `upstream.lock`; no local simulation artifact is accepted by the
bootstrap.

Run the deterministic artifact fetch and the SDL-free VM smoke test with:

```sh
tools/doom-runner/scripts/run-smoke.sh
```

The smoke process loads the official `doom.polkavm`, supplies `doom1.wad`,
executes `ext_initialize` and `ext_tick`, verifies a 640x400 RGBA frame, and
calls `ext_on_keychange` for a press/release pair. It prints
`REAL_POLKAVM_BOOT=PASS` only after all of those operations succeed.

The live browser runtime talks to this runner over one WebSocket per `Run`.
The runner owns one long-lived PolkaVM instance, applies tick-indexed input,
streams the upstream framebuffer, records `DoomReplayV1`, and finalizes only a
completed E1M1 run. It never submits per-frame or per-input MiniJAM Work and it
has no blockchain session state.

The later patched guest and WebSocket service are deliberately out of scope for
this bootstrap. Until this smoke test is green, live DOOM remains unavailable;
the browser does not fall back to the simulation runtime.
