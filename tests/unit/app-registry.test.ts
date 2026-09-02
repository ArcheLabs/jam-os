import { describe, expect, it } from "vitest";
import { systemApps } from "../../src/os/appRegistry";

describe("JAM OS application registry", () => {
  it("registers all core apps with unique ids", () => {
    const ids = systemApps.map((app) => app.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["computer", "files", "terminal", "browser", "playground", "settings"]));
    expect(ids).not.toContain("doom");
  });
});
