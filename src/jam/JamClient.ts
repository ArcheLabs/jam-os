import { JamNetworkError } from "./errors";
import type { AccountInfo, InvokeOptions, InvokeResult, JamClient as JamClientType, NetworkInfo } from "./types";

const encoder = new TextEncoder();
export const jsonBytes = (value: unknown) => encoder.encode(JSON.stringify(value));
export const parseBytes = <T>(bytes: Uint8Array): T => JSON.parse(new TextDecoder().decode(bytes)) as T;

export class RealJamClient implements JamClientType {
  constructor(private readonly endpoint = import.meta.env.VITE_MINIJAM_API_URL as string | undefined) {}
  private ensureEndpoint(): string { if (!this.endpoint) throw new JamNetworkError("Live MiniJAM API endpoint is not configured"); return this.endpoint.replace(/\/$/, ""); }
  async network(): Promise<NetworkInfo> { const endpoint = this.ensureEndpoint(); try { const response = await fetch(`${endpoint}/health`); if (!response.ok) throw new Error(); return { name: import.meta.env.VITE_MINIJAM_NETWORK_NAME || "MiniJAM", endpoint, healthy: true }; } catch { throw new JamNetworkError(`Unable to reach MiniJAM at ${endpoint}`); } }
  async readService(serviceId: string, request: Uint8Array): Promise<Uint8Array> { void serviceId; void request; throw new JamNetworkError("The live Service ABI is not configured yet"); }
  async invokeService(serviceId: string, request: Uint8Array, options?: InvokeOptions): Promise<InvokeResult> { void serviceId; void request; void options; throw new JamNetworkError("The live Service ABI is not configured yet"); }
  async getCurrentAccount(): Promise<AccountInfo | null> { return null; }
}
