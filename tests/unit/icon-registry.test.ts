import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JamAppIcon } from "../../src/ui/icons/JamAppIcon";
import { getJamIconDefinition, jamIconIds } from "../../src/ui/icons/iconRegistry";

const coreApps = ["computer", "files", "browser", "terminal", "playground", "settings", "doom", "help", "trash"];

describe("JAM icon registry", () => {
  it("covers every core app with artwork and regular/filled glyphs", () => {
    expect(jamIconIds).toEqual(expect.arrayContaining(coreApps));
    for (const appId of coreApps) {
      const definition = getJamIconDefinition(appId);
      expect(definition?.artwork, appId).toBeTruthy();
      expect(definition?.glyphRegular, appId).toBeTruthy();
      expect(definition?.glyphFilled, appId).toBeTruthy();
    }
  });

  it("uses artwork for large contexts and a simplified glyph for small contexts", () => {
    const dock = renderToStaticMarkup(createElement(JamAppIcon, { appId: "files", context: "dock" }));
    const window = renderToStaticMarkup(createElement(JamAppIcon, { appId: "files", context: "window" }));
    const menu = renderToStaticMarkup(createElement(JamAppIcon, { appId: "files", context: "menu" }));
    expect(dock).toContain("jam-app-artwork-files");
    expect(window).toContain("jam-system-glyph-window");
    expect(window).not.toContain("jam-app-artwork-files");
    expect(menu).toContain("jam-system-glyph-menu");
  });

  it("falls back to a system glyph for unknown apps", () => {
    const markup = renderToStaticMarkup(createElement(JamAppIcon, { appId: "future-app", context: "dock" }));
    expect(markup).toContain("jam-generated-app-icon");
    expect(markup).toContain("jam-system-glyph-window");
    expect(markup).toContain("jam-app-artwork-generated");
    const windowMarkup = renderToStaticMarkup(createElement(JamAppIcon, { appId: "future-app", context: "window" }));
    expect(windowMarkup).toContain("jam-system-glyph-window");
    expect(windowMarkup).not.toContain("jam-generated-app-icon");
  });
});
