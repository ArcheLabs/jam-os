# DOOM Realtime Contract

Phase 3C deliberately separates fast gameplay from verified MiniJAM execution:

```text
keyboard / mouse -> DoomInput -> realtime session -> DoomFrame -> Canvas
                                            |
                                            +-> checkpoint -> MiniJAM Work
```

## Client contract

`DoomRuntime.connectRealtime(sessionId)` returns a `DoomRealtimeSession`.
Inputs are canonical JSON bytes containing only a tick and ordered actions.
Frames use the `JDF1` binary envelope and contain RGBA pixels for rendering;
they are not canonical game state. A checkpoint returns the authoritative
session tick, state hash, and score.

The Preview adapter uses the deterministic runtime directly and advances one
tick per 30 FPS frame. The Live adapter uses a WebSocket gateway when
`VITE_DOOM_GATEWAY_URL` is configured.

## Gateway messages

Client control messages are JSON objects with `version: 1` and one of:

```text
connect  { sessionId }
input    { sessionId, input: { tick, actions[] } }
pause    { sessionId }
resume   { sessionId }
checkpoint { sessionId }
close    { sessionId }
```

The gateway must relay inputs and binary `JDF1` frames without changing them.
Worker-owned messages include `ready`, `status`, `checkpoint`, and `error`.
The gateway must not generate score, state hash, or frame content.

## Worker expectations

The worker owns the session tick, consumes inputs in tick order, renders each
frame, and periodically creates a MiniJAM checkpoint. Reconnect attaches by
`sessionId`; browser state is never authoritative.
