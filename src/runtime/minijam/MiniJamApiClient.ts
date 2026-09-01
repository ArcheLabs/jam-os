import type { AccountAdapter, AccountInfo, DeployInput } from "../../jam/types";
import { JamAuthorizationError, JamNetworkError, JamNotFoundError, JamProtocolError, JamServiceError } from "../../jam/errors";
import { MiniJamTransport, type Operation, type ServiceView } from "../../jam/transport";

export interface NetworkConfig { name?: string; networkName?: string; genesisHash?: string; finalizedBlock?: string; finalizedBlockNumber?: number; actionDomain?: string; }
export interface PrepareActionRequest { account: AccountInfo; action: "create_service" | "work"; params: Record<string, unknown>; signer: AccountAdapter; }
export interface SubmitWorkRequest { serviceId: string; payload: Uint8Array; extrinsics?: Uint8Array[]; account: AccountInfo; signer: AccountAdapter; }

export class MiniJamApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status?: number, public readonly retryable = false) { super(message); this.name = "MiniJamApiError"; }
}

function normalizeError(error: unknown): MiniJamApiError {
  if (error instanceof MiniJamApiError) return error;
  if (error instanceof JamAuthorizationError) {
    const message = error.message.toLowerCase();
    return new MiniJamApiError(message.includes("reject") || message.includes("sign") ? "SIGNATURE_REJECTED" : "UNAUTHORIZED", error.message, 401, false);
  }
  if (error instanceof JamNotFoundError) return new MiniJamApiError("NOT_FOUND", error.message, 404, false);
  if (error instanceof JamNetworkError) return new MiniJamApiError("NETWORK_UNAVAILABLE", error.message, undefined, true);
  if (error instanceof JamProtocolError) return new MiniJamApiError("INVALID_RESPONSE", error.message, undefined, false);
  if (error instanceof JamServiceError) { const code = error.code === "OPERATION_TIMEOUT" ? "WORK_TIMEOUT" : error.code === "WORK_FAILED" ? "WORK_FAILED" : error.code; return new MiniJamApiError(code, error.message, undefined, code === "MINIJAM_NETWORK_UNAVAILABLE"); }
  return new MiniJamApiError("NETWORK_UNAVAILABLE", error instanceof Error ? error.message : "MiniJAM API request failed", undefined, true);
}

export class MiniJamApiClient {
  constructor(private readonly transport: MiniJamTransport) {}
  async config(): Promise<NetworkConfig> { try { return await this.transport.config(); } catch (error) { throw normalizeError(error); } }
  async getService(serviceId: string): Promise<ServiceView> { try { return await this.transport.getService(serviceId); } catch (error) { throw normalizeError(error); } }
  async getStorage(serviceId: string, key: string): Promise<Uint8Array | null> { try { return await this.transport.storage(serviceId, key); } catch (error) { throw normalizeError(error); } }
  async prepareAction(request: PrepareActionRequest) { try { return await this.transport.prepareAction(request.account, request.action, request.params, request.signer); } catch (error) { throw normalizeError(error); } }
  async submitWork(request: SubmitWorkRequest): Promise<Operation> { try { return await this.transport.submitWorkOperation(request.serviceId, request.payload, request.account, request.signer, request.extrinsics); } catch (error) { throw normalizeError(error); } }
  async getOperation(operationId: string): Promise<Operation> { try { return await this.transport.getOperation(operationId); } catch (error) { throw normalizeError(error); } }
  async createService(request: { input: DeployInput; account: AccountInfo; signer: AccountAdapter }): Promise<Operation> { try { const result = await this.transport.createService(request.input, request.account, request.signer); return { operationId: result.operationId || result.serviceId, status: "succeeded", kind: "create", result: { serviceId: Number(result.serviceId) } }; } catch (error) { throw normalizeError(error); } }
}
