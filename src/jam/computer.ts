import { decodeServiceBytes, jsonBytes, parseBytes } from "./JamClient";
import type { AccountAdapter, JamClient } from "./types";
import { JamFileSystem } from "./filesystem";
import type { PlaygroundAdapter } from "./types";
import { bytesToBase64 } from "./encoding";
import { blake2AsHex } from "@polkadot/util-crypto";
import { JamProtocolError } from "./errors";

export class ComputerService {
  constructor(private readonly client: JamClient, private readonly account: AccountAdapter, private readonly playground?: PlaygroundAdapter) {}
  async create(): Promise<string> { if (import.meta.env.VITE_JAM_MODE !== "live") { const current = await this.account.current(); const result = parseBytes<{ serviceId: string }>(await this.client.invokeService("computer-code", jsonBytes({ op: "computer:create" }), { account: current }).then((r) => r.output)); return result.serviceId; } if (!this.playground) throw new JamProtocolError("Live Playground adapter is unavailable", "COMPUTER_SERVICE_ARTIFACT_NOT_CONFIGURED"); const current = await this.account.current(); if (!current) throw new JamProtocolError("Connect a Polkadot account before creating a Computer Service", "ACCOUNT_SIGNING_UNAVAILABLE"); const artifactUrl = import.meta.env.VITE_COMPUTER_SERVICE_ARTIFACT_URL; const expectedHash = import.meta.env.VITE_COMPUTER_SERVICE_CODE_HASH; if (!artifactUrl || !expectedHash) throw new JamProtocolError("Configure VITE_COMPUTER_SERVICE_ARTIFACT_URL and VITE_COMPUTER_SERVICE_CODE_HASH before creating a live Computer", "COMPUTER_SERVICE_ARTIFACT_NOT_CONFIGURED"); const response = await fetch(artifactUrl); if (!response.ok) throw new JamProtocolError("The canonical Computer Service artifact could not be downloaded", "COMPUTER_SERVICE_ARTIFACT_UNAVAILABLE"); const artifact = new Uint8Array(await response.arrayBuffer()); const actualHash = blake2AsHex(artifact, 256); if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) throw new JamProtocolError("The Computer Service artifact hash does not match configuration", "COMPUTER_SERVICE_ARTIFACT_HASH_MISMATCH"); const deployed = await this.playground.deploy({ blobBase64: bytesToBase64(artifact), codeHash: actualHash, minItemGas: Number(import.meta.env.VITE_COMPUTER_SERVICE_MIN_ITEM_GAS || 10000000), minMemoGas: Number(import.meta.env.VITE_COMPUTER_SERVICE_MIN_MEMO_GAS || 10000000), account: current }); return deployed.serviceId; }
  fs(serviceId: string) { return new JamFileSystem(this.client, serviceId); }
  async inspect(serviceId: string) { return decodeServiceBytes(await this.client.readService(serviceId, jsonBytes({ op: "service:inspect" }))); }
}
