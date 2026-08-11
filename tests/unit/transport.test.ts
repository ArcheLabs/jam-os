import { describe, expect, it } from "vitest";
import { MiniJamTransport } from "../../src/jam/transport";
import { JamNetworkError } from "../../src/jam/errors";

describe("MiniJAM transport", () => {
  it("fails closed when no live endpoint is configured", async () => {
    const transport = new MiniJamTransport("");
    await expect(transport.network()).rejects.toBeInstanceOf(JamNetworkError);
  });
});
