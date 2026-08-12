import { decodeServiceBytes, jsonBytes } from "./JamClient";
import { JnsInvalidNameError, JnsNotConfiguredError } from "./errors";
import type { AccountAdapter, JamClient, JnsRecord } from "./types";

export function validateName(name: string): string { const normalized = name.toLowerCase(); if (normalized.length < 3 || normalized.length > 32 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalized)) throw new JnsInvalidNameError("Names use 3–32 lowercase ASCII letters, digits, and hyphens"); return normalized; }
export class JamNameService {
  constructor(private readonly client: JamClient, private readonly account: AccountAdapter) {}
  private serviceId() { const configured = import.meta.env.VITE_JNS_SERVICE_ID; if (configured) return configured; if (!this.client.isMock) throw new JnsNotConfiguredError(); return "jns-mock"; }
  async resolve(name: string): Promise<JnsRecord> { const normalized = validateName(name); return decodeServiceBytes(await this.client.readService(this.serviceId(), jsonBytes({ op: "jns:resolve", name: normalized }))); }
  async record(name: string) { return this.resolve(name); }
  async show(name: string) { return this.record(name); }
  async claim(name: string, serviceId: string): Promise<JnsRecord> { const normalized = validateName(name); const account = await this.account.current(); if (!account) throw new Error("Connect an account first"); return decodeServiceBytes(await this.client.invokeService(this.serviceId(), jsonBytes({ op: "jns:claim", name: normalized, serviceId, owner: account.address }), { account }).then((r) => r.output)); }
  async bind(name: string, serviceId: string): Promise<JnsRecord> { const normalized = validateName(name); const account = await this.account.current(); if (!account) throw new Error("Connect an account first"); return decodeServiceBytes(await this.client.invokeService(this.serviceId(), jsonBytes({ op: "jns:bind", name: normalized, serviceId, owner: account.address }), { account }).then((r) => r.output)); }
}
