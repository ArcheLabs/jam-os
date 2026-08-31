import { describe, expect, it } from "vitest";
import { MiniJamTransport } from "../../src/jam/transport";
import { JamNetworkError } from "../../src/jam/errors";

describe("MiniJAM transport", () => {
  it("fails closed when no live endpoint is configured", async () => {
    const transport = new MiniJamTransport("");
    await expect(transport.network()).rejects.toBeInstanceOf(JamNetworkError);
  });
  it("uses the neutral node JSON-RPC for network context", async () => {
    const originalFetch = globalThis.fetch;
    let headers: Headers | undefined;
    globalThis.fetch = async (_input, init) => {
      headers = new Headers(init?.headers);
      return new Response(JSON.stringify({ result: { blockHash: "0x01", blockNumber: 1, stateRoot: "0x02", slot: 1 } }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      await expect(new MiniJamTransport("https://node.example.test").network()).resolves.toMatchObject({ block: "0x01" });
      expect(headers?.get("content-type")).toBe("application/json");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
