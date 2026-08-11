# JAM Computer architecture

JAM Computer is a static React/Vite application. The local browser renders the desktop and windows; persistent computer state and service execution are accessed through typed adapters.

```text
Desktop / apps
      |
JamFileSystem · JamNameService · PlaygroundAdapter
      |
JamClient / AccountAdapter
      |
MiniJAM Services
```

Window positions, focus, and open windows are ephemeral local UI state. Files, published site manifests, names, and service calls are JAM state. In mock mode those same adapter contracts are backed by an isolated mock client, never by the live path.

The six V0 apps are registered in `src/App.tsx`. The Browser owns one shared history and routes `jam://`, `file://`, `http://`, `https://`, and `about:` through handlers. JAM/file HTML is sanitized and rendered in a sandboxed iframe; page-authored JavaScript is removed and only the small Browser-owned JAM link bridge is injected.
