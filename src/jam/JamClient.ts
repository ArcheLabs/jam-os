import { JamNetworkError, JamServiceError } from "./errors";
import type { AccountAdapter, AccountInfo, InvokeOptions, InvokeResult, JamClient as JamClientType, NetworkInfo } from "./types";
import { MiniJamTransport } from "./transport";

const encoder = new TextEncoder();
export const jsonBytes = (value: unknown) => {
  const body = value && typeof value === "object" && !Array.isArray(value) && "op" in value && !("v" in value)
    ? { v: 1, ...(value as Record<string, unknown>) }
    : value;
  return encoder.encode(JSON.stringify(body));
};
export const parseBytes = <T>(bytes: Uint8Array): T => JSON.parse(new TextDecoder().decode(bytes)) as T;
export const decodeServiceBytes = <T>(bytes: Uint8Array): T => {
  const value = parseBytes<unknown>(bytes);
  if (value && typeof value === "object" && !Array.isArray(value) && "ok" in value && (value as { ok: boolean }).ok === false) {
    const error = (value as { error?: { code?: string; message?: string } }).error;
    throw new JamServiceError(error?.message || "JAM Service rejected the request", error?.code || "SERVICE_ERROR");
  }
  return value as T;
};

export class RealJamClient implements JamClientType {
  readonly isMock = false;
  constructor(private readonly transport: MiniJamTransport, private readonly account: AccountAdapter) {}
  async network(): Promise<NetworkInfo> { return this.transport.network(); }
  async readService(serviceId: string, request: Uint8Array): Promise<Uint8Array> { return this.transport.readService(serviceId, request); }
  async invokeService(serviceId: string, request: Uint8Array, options?: InvokeOptions): Promise<InvokeResult> {
    const account = options?.account === undefined ? await this.account.current() : options.account;
    return this.transport.invokeService(serviceId, request, { ...options, account }, this.account);
  }
  async getCurrentAccount(): Promise<AccountInfo | null> { return this.account.current(); }
}
