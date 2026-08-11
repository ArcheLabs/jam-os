# Computer Service

This directory documents the canonical Computer Service boundary used by JAM Computer. The browser client sends the logical operations described in `JAM_OS_IMPLEMENTATION_SPEC.md` through `JamClient`; it does not contain a server or database.

The real MiniJAM service implementation is intentionally ABI-dependent. When the service ABI is finalized, its request encoding belongs here and in the live adapter, while the UI-facing `JamFileSystem` API remains stable.
