# JAM OS UI Modernization v1

## A. Summary

The existing React/Vite JAM OS architecture remains intact. This iteration adds a coherent JAM visual system around the existing shell and runtime adapters, using the supplied boot, login, and desktop images as art direction rather than copying them.

Implemented:

- Deep blue, cyan, and violet wallpaper layers built with CSS gradients.
- Reusable JAM Orb branding in `src/ui/brand/JamLogo.tsx`.
- Reusable wallpaper layer in `src/ui/shell/JamWallpaper.tsx`.
- Full-screen boot composition with restrained loading dots.
- Login composition with clock/date, wallet-aware copy, network status, and glass panel.
- JAM Dock with running-window state and a JAM launcher.
- JAM-native Control Center for network, wallet, Computer Service, appearance, and motion state.
- Active and inactive window visual states, visible focus rings, semantic dialog labels, and preserved drag/resize behavior.
- Shared application chrome for Files, Terminal, Browser, Settings, and Playground.
- Deterministic mock preview routes: `/?preview=boot`, `/?preview=login`, and `/?preview=desktop`.

No JAM, MiniJAM, Computer Service, artifact, or protocol semantics were changed.

## B. Baseline

- Baseline branch: `main`
- Baseline commit: `82017baaed44f8cbaa8c827a41436f28f8c84334`
- Current implementation branch: `codex/jam-os-modern-ui`
- Stack: React 19, TypeScript, Vite, Lucide React, Monaco, xterm, JAM/MiniJAM adapters.
- No new runtime dependency was added. Existing Lucide icons are reused.
- Window state remains `{ id, title, x, y, width, height, zIndex, minimized, maximized }`.
- Boot flow remains boot → login → connecting/account → provisioning → desktop/error.
- Mock mode remains selected through `VITE_JAM_MODE=mock`; preview routes force mock runtime for visual iteration.

## C. Design System

Canonical tokens live in `src/styles/theme/tokens.css`. They define the JAM background palette, cyan/blue/violet accents, semantic text colors, surface levels, borders, radii, blur, shadows, and motion easing.

`src/styles/modern-os.css` is a shell/app visual layer loaded after the existing styles. It provides the JAM glass language, restrained gradients, spacing rhythm, focus-visible treatment, reduced-motion behavior, and consistent component states without introducing a visual framework.

The wallpaper is CSS-generated to keep the product distinct from the reference images and avoid shipping an unverified third-party asset.

## D. Shell

`BootScreen` now uses a sparse full-screen JAM Orb composition. Login and account/provisioning states share the wallpaper and system status header while keeping wallet semantics accurate: live mode says “Connect Polkadot Account”; mock mode says “Enter Preview Computer”.

`App` now supports deterministic preview states and renders the desktop wallpaper, status/menu bar, widgets, windows, Dock, launcher, and Control Center as separate shell layers. Hardware controls that the browser cannot actually control are not presented as actionable system controls.

## E. Windows

The existing manual pointer-based window manager remains in place to avoid changing reliable geometry behavior. `Window` now exposes active/inactive visual state, `role="dialog"`, and title-based accessibility labels. Minimize, maximize/restore, close, drag, resize, focus, and z-order callbacks are unchanged.

## F. Apps

The shared visual layer updates Files, Terminal, Browser, Settings, Help, and Playground surfaces with the same border, radius, control, input, toolbar, and focus language. App internals and runtime calls are unchanged.

## G. Tests

Commands run:

```text
npm install --ignore-scripts --no-audit --no-fund  PASS
npm test -- --run                                      PASS
npm run build                                           PASS
git diff --check                                        PASS
```

Results:

- 24 test files passed.
- 76 unit tests passed.
- TypeScript and Vite production build passed.
- Build emitted existing third-party Rollup annotation/chunk-size warnings only.

## H. Screenshots

The supplied reference images were reviewed for composition, palette, glass surfaces, spacing, and shell hierarchy. No binary screenshots were committed because a browser screenshot runner is not part of the current repository tooling.

Preview targets for manual capture:

```text
http://localhost:5173/?preview=boot
http://localhost:5173/?preview=login
http://localhost:5173/?preview=desktop
```

## I. Remaining gaps

Intentionally deferred for a follow-up pass:

- Radix-based context menus, dialogs, tooltips, and toast primitives.
- Window snapping and animated close/minimize transitions.
- Full Playwright visual regression coverage and committed acceptance screenshots.
- A larger Settings information architecture and editable appearance preferences.
- Live RPC/wallet smoke testing, which requires the user's live environment and credentials.

## Machine-readable status

```text
JAM_UI_TOKENS=PASS
BOOT_SCREEN=PASS
LOGIN_SCREEN=PASS
DESKTOP_SHELL=PASS
WINDOW_SYSTEM=PASS
DOCK=PASS
MENU_BAR=PASS
CONTROL_CENTER=PASS
FILES_CHROME=PASS
TERMINAL_CHROME=PASS
BROWSER_CHROME=PASS
SETTINGS_CHROME=PASS
ACCESSIBILITY=PASS
REDUCED_MOTION=PASS
TESTS=PASS
BUILD=PASS
LIVE_SMOKE=NOT_RUN
```
