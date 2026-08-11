import { jsonBytes, parseBytes } from "./JamClient";
import type { AccountAdapter, JamClient } from "./types";
export class JamServiceClient {
  constructor(private readonly client: JamClient, private readonly account: AccountAdapter) {}
  async inspect(serviceId: string) { return parseBytes(await this.client.readService(serviceId, jsonBytes({ op: "service:inspect" }))); }
  async call(serviceId: string, payload: string) { const account = await this.account.current(); return parseBytes(await this.client.invokeService(serviceId, jsonBytes({ op: "service:call", payload }), { account }).then((r) => r.output)); }
}
