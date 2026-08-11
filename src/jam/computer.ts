import { jsonBytes, parseBytes } from "./JamClient";
import type { AccountAdapter, JamClient } from "./types";
import { JamFileSystem } from "./filesystem";

export class ComputerService {
  constructor(private readonly client: JamClient, private readonly account: AccountAdapter) {}
  async create(): Promise<string> { const current = await this.account.current(); const result = parseBytes<{ serviceId: string }>(await this.client.invokeService("computer-code", jsonBytes({ op: "computer:create" }), { account: current }).then((r) => r.output)); return result.serviceId; }
  fs(serviceId: string) { return new JamFileSystem(this.client, serviceId); }
  async inspect(serviceId: string) { return parseBytes(await this.client.readService(serviceId, jsonBytes({ op: "service:inspect" }))); }
}
