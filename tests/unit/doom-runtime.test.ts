import { describe, expect, it } from "vitest";
import { MockJamOsRuntime } from "../../src/runtime/mock/MockJamOsRuntime";

describe("DOOM preview runtime", () => {
  it("creates a session and produces a result without claiming trusted execution", async () => {
    const runtime = new MockJamOsRuntime();
    const session = await runtime.doom.start({ map: "E1M1" });
    expect(session.mode).toBe("mock");
    const result = await runtime.doom.stop(session.id);
    expect(result.score).toBeGreaterThan(0);
    expect(result.execution).toBeUndefined();
  });

  it("sorts demo leaderboard scores descending and filters my scores", async () => {
    const runtime = new MockJamOsRuntime();
    const globalScores = await runtime.doom.leaderboard();
    expect(globalScores[0].score).toBeGreaterThan(globalScores[1].score);
    expect(globalScores.every((entry) => entry.runtime === "mock")).toBe(true);
    const session = await runtime.doom.start();
    await runtime.doom.stop(session.id);
    const mine = await runtime.doom.leaderboard({ account: "5MockJAMComputerAccount" });
    expect(mine).toHaveLength(1);
    expect(mine[0].runId).toContain("mock-run");
  });
});
