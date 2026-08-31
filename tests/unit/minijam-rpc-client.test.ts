import { describe, expect, it, vi } from "vitest";
import { HttpJsonRpcTransport, MiniJamRpcClient, MiniJamRpcError } from "../../src/runtime/minijam/MiniJamRpcClient";

describe("MiniJamRpcClient", () => {
  it("uses generic node RPC for reads and signed extrinsic submission", async () => {
    const request = vi.fn(async (method: string) => method === "minijam_getWork" ? "0x1234" : "0xabcd");
    const client = new MiniJamRpcClient({ request });
    await expect(client.work(7)).resolves.toBe("0x1234");
    await expect(client.submitSignedExtrinsic("0xdead")).resolves.toBe("0xabcd");
    expect(request).toHaveBeenNthCalledWith(1, "minijam_getWork", [7]);
    expect(request).toHaveBeenNthCalledWith(2, "author_submitExtrinsic", ["0xdead"]);
  });

  it("surfaces JSON-RPC errors without falling back to Playground", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "missing" } }), { status: 200 }));
    const client = new MiniJamRpcClient(new HttpJsonRpcTransport("https://rpc.example", fetcher as typeof fetch));
    await expect(client.executionReceipt(1)).rejects.toEqual(expect.objectContaining<Partial<MiniJamRpcError>>({ method: "minijam_getExecutionReceipt", code: -32601 }));
  });
});
