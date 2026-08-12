import { describe, expect, it } from "vitest";
import { MiniJamTransport } from "../../src/jam/transport";
import { JamNetworkError } from "../../src/jam/errors";

describe("MiniJAM transport", () => {
  it("fails closed when no live endpoint is configured", async () => {
    const transport = new MiniJamTransport("");
    await expect(transport.network()).rejects.toBeInstanceOf(JamNetworkError);
  });
  it("does not trigger a JSON preflight header for GET requests", async () => {
    const originalFetch = globalThis.fetch;
    let headers: Headers | undefined;
    globalThis.fetch = async (_input, init) => {
      headers = new Headers(init?.headers);
      return new Response(JSON.stringify({ networkName: "MiniJAM", genesisHash: "0x01" }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      await new MiniJamTransport("https://example.test/api/v1").network();
      expect(headers?.has("content-type")).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
