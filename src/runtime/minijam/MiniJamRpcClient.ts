export type RpcParams = readonly unknown[];

export interface JsonRpcTransport {
  request<T>(method: string, params?: RpcParams): Promise<T>;
}

export class MiniJamRpcError extends Error {
  constructor(public readonly method: string, message: string, public readonly code?: number) {
    super(message);
    this.name = "MiniJamRpcError";
  }
}

/** Generic MiniJAM node JSON-RPC client. It contains no Playground or app-specific methods. */
export class MiniJamRpcClient {
  constructor(private readonly transport: JsonRpcTransport) {}

  finalizedContext() { return this.transport.request<{ blockHash: string; blockNumber: number; stateRoot: string; slot: number }>("minijam_getFinalizedContext"); }
  work(workId: string | number) { return this.transport.request<string | null>("minijam_getWork", [workId]); }
  workIdByPackageHash(packageHash: string) { return this.transport.request<number | null>("minijam_getWorkIdByPackageHash", [packageHash]); }
  executionReceipt(workId: string | number) { return this.transport.request<string | null>("minijam_getExecutionReceipt", [workId]); }
  async service(serviceId: string | number) { const context = await this.finalizedContext(); return this.transport.request<string | null>("minijam_getServiceInfoAt", [context.blockHash, Number(serviceId)]); }
  async serviceStorage(serviceId: string | number, keyHex: string) { const context = await this.finalizedContext(); return this.transport.request<string | null>("minijam_getServiceStorageAt", [context.blockHash, Number(serviceId), keyHex]); }
  accountNonce(account: string) { return this.transport.request<number>("system_accountNextIndex", [account]); }
  submitSignedExtrinsic(extrinsicHex: string) { return this.transport.request<string>("author_submitExtrinsic", [extrinsicHex]); }
}

export class HttpJsonRpcTransport implements JsonRpcTransport {
  private nextId = 1;
  constructor(readonly endpoint: string, private readonly fetcher: typeof fetch = globalThis.fetch) {}

  async request<T>(method: string, params: RpcParams = []): Promise<T> {
    if (!this.endpoint) throw new MiniJamRpcError(method, "MiniJAM RPC endpoint is not configured");
    const response = await this.fetcher(this.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: this.nextId++, method, params }) });
    if (!response.ok) throw new MiniJamRpcError(method, `MiniJAM RPC returned HTTP ${response.status}`);
    const body = await response.json() as { result?: T; error?: { code?: number; message?: string } };
    if (body.error) throw new MiniJamRpcError(method, body.error.message || "MiniJAM RPC request failed", body.error.code);
    if (!("result" in body)) throw new MiniJamRpcError(method, "MiniJAM RPC response did not contain a result");
    return body.result as T;
  }
}

export interface MiniJamExtrinsicSigner {
  readonly account: string;
  signExtrinsic(payload: Uint8Array): Promise<Uint8Array>;
}
