import { describe, expect, it } from "vitest";
import { MiniJamTransport } from "../../src/jam/transport";
import { MiniJamApiClient } from "../../src/runtime/minijam/MiniJamApiClient";

describe("MiniJAM API client", () => {
  it("normalizes service and storage requests onto finalized node RPC", async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    globalThis.fetch = async (input, init) => {
      requests.push(String(input));
      const request = JSON.parse(String(init?.body)) as { method: string };
      if (request.method === "minijam_getFinalizedContext") return new Response(JSON.stringify({ result: { blockHash: "0x01", blockNumber: 1, stateRoot: "0x02", slot: 1 } }), { status: 200 });
      if (request.method === "minijam_getServiceStorageAt") return new Response(JSON.stringify({ result: "0x6869" }), { status: 200 });
      return new Response(JSON.stringify({ result: "0x0102" }), { status: 200 });
    };
    try {
      const api = new MiniJamApiClient(new MiniJamTransport("https://node.example.test"));
      await expect(api.getService("183")).resolves.toMatchObject({ serviceId: 183 });
      await expect(api.getStorage("183", "fs:node:/home/user")).resolves.toEqual(new Uint8Array([0x68, 0x69]));
      expect(requests).toEqual(Array(4).fill("https://node.example.test"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps an unavailable endpoint to a retryable network error", async () => {
    const api = new MiniJamApiClient(new MiniJamTransport(""));
    await expect(api.config()).rejects.toMatchObject({ code: "NETWORK_UNAVAILABLE", retryable: true });
  });
});
