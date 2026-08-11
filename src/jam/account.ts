import type { AccountAdapter, AccountInfo } from "./types";
import type { JamClient } from "./types";
export class MockAccountAdapter implements AccountAdapter {
  constructor(private readonly client: JamClient) {}
  current() { return this.client.getCurrentAccount(); }
  async connect(): Promise<AccountInfo> { const account = await this.current(); if (!account) throw new Error("Mock account unavailable"); return account; }
  async disconnect() { /* mock accounts are deterministic */ }
}
export class BrowserAccountAdapter implements AccountAdapter {
  private account: AccountInfo | null = null;
  async current() { return this.account; }
  async connect() { this.account = { address: "browser-wallet", name: "Browser wallet", source: "manual" }; return this.account; }
  async disconnect() { this.account = null; }
}
