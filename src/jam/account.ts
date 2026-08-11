import { u8aToHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { JamAuthorizationError } from "./errors";
import type { AccountAdapter, AccountInfo, SignContext } from "./types";
import type { JamClient } from "./types";
export class MockAccountAdapter implements AccountAdapter {
  constructor(private readonly client: JamClient) {}
  current() { return this.client.getCurrentAccount(); }
  async connect(): Promise<AccountInfo> { const account = await this.current(); if (!account) throw new Error("Mock account unavailable"); return account; }
  async disconnect() { /* mock accounts are deterministic */ }
}
export class BrowserAccountAdapter implements AccountAdapter {
  private account: AccountInfo | null = null;
  private rawAddress: string | null = null;
  async current() { return this.account; }
  async connect() { const { web3Accounts, web3Enable } = await import("@polkadot/extension-dapp"); const extensions = await web3Enable("JAM Computer"); if (!extensions.length) throw new JamAuthorizationError("No compatible Polkadot wallet extension was found"); const accounts = await web3Accounts(); const selected = accounts.find((item) => item.type === "sr25519") || accounts[0]; if (!selected) throw new JamAuthorizationError("No wallet account is available"); if (selected.type && selected.type !== "sr25519") throw new JamAuthorizationError("MiniJAM Stage 0 requires an sr25519 account"); this.rawAddress = selected.address; this.account = { address: u8aToHex(decodeAddress(selected.address)), name: selected.meta.name || "Wallet account", source: selected.meta.source, type: selected.type }; return this.account; }
  async disconnect() { this.account = null; this.rawAddress = null; }
  async sign(payloadHex: string, _context: SignContext) { if (!this.account || !this.rawAddress) throw new JamAuthorizationError(); const { web3FromAddress } = await import("@polkadot/extension-dapp"); const injector = await web3FromAddress(this.rawAddress); if (!injector.signer.signRaw) throw new JamAuthorizationError("The selected wallet cannot sign raw payloads"); try { return (await injector.signer.signRaw({ address: this.rawAddress, data: payloadHex, type: "bytes" })).signature; } catch (error) { throw new JamAuthorizationError(error instanceof Error ? error.message : "Wallet signing failed"); } }
}
