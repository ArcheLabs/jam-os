import { describe, expect, it } from "vitest";
import { MiniJamTransport } from "../../src/jam/transport";
import { MiniJamApiClient } from "../../src/runtime/minijam/MiniJamApiClient";

describe("MiniJAM API client", () => {
  it("normalizes service and storage requests onto the live API", async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    globalThis.fetch = async (input) => {
      requests.push(String(input));
      if (String(input).includes("/storage?key=")) return new Response(JSON.stringify({ value: "0x6869" }), { status: 200 });
      return new Response(JSON.stringify({ serviceId: 183, controller: "5Alice", codeHash: "0xabc", codeLength: 3, preimageReady: true, finalizedBlock: "0x01", finalizedBlockNumber: 1 }), { status: 200 });
    };
    try {
      const api = new MiniJamApiClient(new MiniJamTransport("https://example.test/api/v1"));
      await expect(api.getService("183")).resolves.toMatchObject({ serviceId: 183 });
      await expect(api.getStorage("183", "fs:node:/home/user")).resolves.toEqual(new Uint8Array([0x68, 0x69]));
      expect(requests).toEqual([
        "https://example.test/api/v1/services/183",
        "https://example.test/api/v1/services/183/storage?key=0x66733a6e6f64653a2f686f6d652f75736572",
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps an unavailable endpoint to a retryable network error", async () => {
    const api = new MiniJamApiClient(new MiniJamTransport(""));
    await expect(api.config()).rejects.toMatchObject({ code: "NETWORK_UNAVAILABLE", retryable: true });
  });
});
