# JAM OS Icon System v1

## Purpose

JAM OS separates application identity from interface controls:

```text
App Artwork    → desktop, Dock, Launcher, About
System Glyphs  → window titles, menus, toolbars, status
Content Icons  → files, folders, documents, code, images, archives
```

The central rule is: an app icon is an object/identity, while a system icon is a functional glyph.

## Architecture

The canonical implementation lives under `src/ui/icons/`:

- `iconRegistry.tsx` maps each core app to custom artwork, Fluent Regular/Filled glyphs, shape, and dominant color.
- `JamAppIcon.tsx` selects artwork for `desktop`, `dock`, `launcher`, and `about`; it selects a small system glyph for `window` and `menu`.
- `JamSystemGlyph.tsx` renders the Fluent optical glyph layer and unknown-app fallback.
- `JamFileIcon.tsx` renders flat Fluent content icons for file rows.
- `artwork/` contains the nine 128×128 JAM SVG objects.
- `src/styles/theme/icons.css` is the only canonical icon styling layer.

`useId()` prefixes every SVG gradient/filter ID so multiple copies can safely render in Dock, Launcher, titlebars, and the Gallery.

## Artwork direction

All artwork shares upper-left lighting, restrained depth, a near shadow, and a 12px safe edge. Silhouettes are intentionally different:

| App | Object identity | Palette |
| --- | --- | --- |
| JAM Computer | monitor/device with JAM orb screen | cyan / blue / navy |
| Files | layered folder with document hint | sky blue / cobalt |
| Browser | circular globe/orb | blue / cyan / violet |
| Terminal | dark terminal window with prompt | graphite / cyan |
| Playground | violet workbench panel with code marks | violet / cyan |
| Settings | standalone steel gear | cool steel / graphite |
| DOOM | coral-magenta game controller | coral / magenta / violet |
| Help | soft speech/help bubble | teal / cyan |
| Trash | translucent steel bin | pale steel / blue-gray |

No app is represented by a generic colored tile containing a monochrome glyph.

## Optical sizing

| Context | Target |
| --- | ---: |
| Desktop artwork | 72px |
| Dock artwork | 54px |
| Launcher artwork | 48px |
| About artwork | 92px |
| Window glyph | 18px |
| Menu glyph | 19px |
| File row icon | 24px |

At small sizes, the component never shrinks full artwork into a titlebar tile; it switches to Fluent Regular/Filled glyphs.

## Accessibility and motion

- Normal mode uses decorative full-color artwork with accessible labels supplied by surrounding controls.
- `forced-colors: active` hides decorative artwork and exposes a monochrome Fluent glyph fallback.
- Hover/pressed states use a small lift and scale only; the running state uses a dot indicator instead of an intense glow.
- `prefers-reduced-motion: reduce` disables icon transforms.

## Preview and tests

Open `http://localhost:5173/?preview=icons` to inspect every core icon at 96, 72, 54, 48, 32, 24, and 18px against dark and light surfaces. The Gallery includes label removal and grayscale checks.

The icon registry tests verify 100% core-app coverage, artwork/glyph separation, small-context simplification, and unknown-app fallback.

## Acceptance status

```text
ICON_ARCHITECTURE=PASS
CUSTOM_CORE_APP_ARTWORK=PASS
UNIQUE_APP_SILHOUETTES=PASS
OPTICAL_SIZING=PASS
FLUENT_SYSTEM_GLYPHS=PASS
DOCK_ICON_BALANCE=PASS
WINDOW_GLYPH_LAYER=PASS
FILE_ICON_LAYER=PASS
FORCED_COLORS=PASS
ICON_GALLERY=PASS
```

Screenshot artifacts are intentionally not committed because this repository does not currently include a browser screenshot runner. The deterministic Gallery route is the review artifact until that tooling is added.
