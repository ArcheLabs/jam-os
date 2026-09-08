# JAM OS Material & Visual Fidelity v1

## Baseline and intent

- Baseline: `53ed29216a32274956a858f815d5b721de499d1c`
- Scope: visual fidelity only. Runtime, MiniJAM, wallet, RPC, Computer Service, protocol, and application behavior are unchanged.
- Reference goals: a calm organic environment, optically layered glass, restrained system chrome, clear hero objects, and substantially lower information density.

The previous shell used explicit orbital geometry, a flat dark-card treatment across most surfaces, and persistent developer/status cards. This pass replaces those traits with a single ambient environment and four visibly distinct material levels.

## Material system

The canonical tokens live in `src/styles/theme/tokens.css`. Material recipes are defined in `src/styles/theme/materials.css`; typography and motion are separated into their own theme files. `modern-os.css` now focuses on shell layout and component-specific presentation instead of accumulating override generations.

| Level | Use | Treatment |
|---|---|---|
| Environment | Wallpaper and ambient light | Matte navy base, low-frequency cyan/blue/violet fields, deep vignette |
| Glass | Login, windows, menus, Dock, Control Center | Translucent gradient fill, environmental reflection, directional highlight, blur and saturation |
| Raised controls | Primary and secondary controls | Denser local fill, compact highlight, reduced blur, tactile hover/pressed states |
| Hero objects | JAM orb and full-color app icons | Strongest silhouette, upper-left lighting, inner shading and restrained depth |

The shared `.jam-glass` primitive combines a translucent multi-stop fill, a soft non-uniform border, backdrop blur/saturation, directional inner highlight, lower-edge shading, environment-colored reflection, and external depth. Surface variants deliberately change fill density, blur, and shadow: windows are heavier than the login panel, while the Dock is lighter and sizes around its contents.

## Wallpaper architecture

`JamWallpaper` uses CSS/vector-native layers only; no external or reference-derived raster asset was introduced. Each phase shares the same physical environment, with small phase-level shifts in illumination. Three oversized irregular fields provide violet, cyan, and blue volume over a deep navy base and vignette. Their edges are heavily softened, and any motion is a slow transform/opacity drift disabled by reduced-motion preferences.

The implementation contains no grid, stars, orbital rings, sharp beams, or continuously animated filters.

## Typography and density

The type hierarchy is reduced to hero, primary, secondary, and tertiary levels. Proportional system typography replaces status-like clock styling; wide tracking remains limited to the JAM OS wordmark and tiny category labels. Text opacity, rather than pure white everywhere, carries hierarchy.

The login screen now presents only time, date, the hero JAM orb, one identity line, one primary action, and the JAM OS signature. Preview mode adds a single subtle `Preview` badge. Default desktop diagnostic cards and explanatory captions were removed, leaving the wallpaper, system chrome, two desktop objects, and the compact Dock.

## Deterministic review routes

- `?preview=boot` — boot identity
- `?preview=login` — login material and hierarchy
- `?preview=desktop` — clean low-density desktop
- `?preview=desktop-window` — active/inactive window hierarchy

All primary captures are 1920×1080. The Dock artifact is an additional crop from the desktop capture.

## Before and after

| View | Baseline | Material v1 |
|---|---|---|
| Boot/login environment | [baseline boot](../../artifacts/ui/material-v1/baseline/boot.png) | [boot](../../artifacts/ui/material-v1/boot.png) |
| Login | [baseline login](../../artifacts/ui/material-v1/baseline/login.png) | [login](../../artifacts/ui/material-v1/login.png) |
| Desktop | [baseline desktop](../../artifacts/ui/material-v1/baseline/desktop.png) | [desktop](../../artifacts/ui/material-v1/desktop.png) |
| Window hierarchy | — | [desktop with windows](../../artifacts/ui/material-v1/desktop-window.png) |
| Dock detail | — | [Dock](../../artifacts/ui/material-v1/dock.png) |

## Visual scorecard

Scores are qualitative comparisons against the supplied product-render references, not pixel-match claims.

| Dimension | Score (0–5) |
|---|---:|
| Wallpaper softness | 4.2 |
| Glass depth | 4.4 |
| Lighting | 4.2 |
| Surface hierarchy | 4.5 |
| Typography | 4.3 |
| Negative space | 4.8 |
| Controls | 4.3 |
| Icon integration | 4.4 |
| Overall polish | 4.3 |
| **Average** | **4.38** |

Acceptance review:

- Obvious circles, rings, or geometric construction: **No**.
- Login panel visibly inherits surrounding environment colors: **Yes**.
- Window, Dock, button, and login panel are materially distinguishable: **Yes**.
- Developer/debug information is visible on the main login screen: **No**.
- The screenshots read more like an OS product render than a web dashboard: **Yes**.

## Accessibility and performance

Focus-visible treatment, semantic error colors, keyboard controls, and forced-colors fallbacks remain available. `prefers-reduced-motion` disables wallpaper drift, large entrance transforms, and hover lift. Backdrop blur is limited to major optical surfaces; the wallpaper animation uses transforms and opacity rather than animated filters or shadows.

## Remaining gaps

- The wallpaper is intentionally CSS-native and restrained; a future art-directed vector study could add more sculptural folds without introducing a large raster dependency.
- Secondary application content retains its existing information architecture. This pass aligns its chrome and material but does not redesign each application.
- The preview account/network labels remain truthful fixture data inside Settings; they are absent from the primary login composition.
