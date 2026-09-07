# JAM OS Icon Asset Provenance

## Canonical sources

| Source | License | Usage | Modification |
| --- | --- | --- | --- |
| JAM OS custom SVG artwork | Original project code | Computer, Files, Browser, Terminal, Playground, Settings, DOOM, Help, Trash | Authored in-repository at `src/ui/icons/artwork/`; no external artwork copied |
| Microsoft Fluent UI System Icons via `@fluentui/react-icons` | MIT | Regular/Filled system glyphs and file/content icons | Used as React SVG components without bundled third-party raster assets |
| Lucide React | ISC | Existing app-internal utility controls during gradual migration | Existing dependency; not used as canonical App Artwork |

## Constraints

- Core JAM artwork is vector-only, uses a 128×128 viewBox, and contains no remote assets, base64 images, or animated blur filters.
- Fluent Color/Emoji assets are not used as JAM app identity artwork.
- JAM OS does not copy Apple, Windows, or other proprietary application icons.
- New third-party apps should provide their own 128×128 SVG artwork through a future client-local contract; no protocol change is introduced here.
