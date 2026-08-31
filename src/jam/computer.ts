import { decodeServiceBytes, jsonBytes, parseBytes } from "./JamClient";
import type { AccountAdapter, JamClient } from "./types";
import { JamFileSystem } from "./filesystem";
import type { PlaygroundAdapter } from "./types";
import { bytesToBase64 } from "./encoding";
import { blake2AsHex } from "@polkadot/util-crypto";
import { JamAuthorizationError, JamProtocolError } from "./errors";
import { clearComputerCache, readComputerCache, writeComputerCache } from "./computerCache";
import type { AccountInfo, ComputerInspection, NetworkInfo } from "./types";
import { MOCK_COMPUTER_CODE_HASH } from "./constants";
import { JamScriptComputerBackend } from "./computerBackend";

export type ProvisionStep = "account" | "computer" | "filesystem" | "network";
export interface ProvisionProgress { step: ProvisionStep; status: "active" | "done"; detail?: string; }
export interface ProvisionedComputer { account: AccountInfo; network: NetworkInfo; serviceId: string; }

export class ComputerService {
  constructor(private readonly client: JamClient, private readonly account: AccountAdapter, private readonly playground?: PlaygroundAdapter) {}
  async create(): Promise<string> { if (this.client.isMock) { const current = await this.account.current(); const result = parseBytes<{ serviceId: string }>(await this.client.invokeService("computer-code", jsonBytes({ op: "computer:create" }), { account: current }).then((r) => r.output)); return result.serviceId; } if (!this.playground) throw new JamProtocolError("Live Playground adapter is unavailable", "COMPUTER_SERVICE_ARTIFACT_NOT_CONFIGURED"); const current = await this.account.current(); if (!current) throw new JamProtocolError("Connect a Polkadot account before creating a Computer Service", "ACCOUNT_SIGNING_UNAVAILABLE"); const artifactUrl = import.meta.env.VITE_COMPUTER_SERVICE_ARTIFACT_URL; const expectedHash = import.meta.env.VITE_COMPUTER_SERVICE_CODE_HASH; if (!artifactUrl || !expectedHash) throw new JamProtocolError("Configure VITE_COMPUTER_SERVICE_ARTIFACT_URL and VITE_COMPUTER_SERVICE_CODE_HASH before creating a live Computer", "COMPUTER_SERVICE_ARTIFACT_NOT_CONFIGURED"); const response = await fetch(artifactUrl); if (!response.ok) throw new JamProtocolError("The canonical Computer Service artifact could not be downloaded", "COMPUTER_SERVICE_ARTIFACT_UNAVAILABLE"); const artifact = new Uint8Array(await response.arrayBuffer()); const actualHash = blake2AsHex(artifact, 256); if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) throw new JamProtocolError("The Computer Service artifact hash does not match configuration", "COMPUTER_SERVICE_ARTIFACT_HASH_MISMATCH"); const deployed = await this.playground.deploy({ blobBase64: bytesToBase64(artifact), codeHash: actualHash, minItemGas: Number(import.meta.env.VITE_COMPUTER_SERVICE_MIN_ITEM_GAS || 10000000), minMemoGas: Number(import.meta.env.VITE_COMPUTER_SERVICE_MIN_MEMO_GAS || 1), account: current }); return deployed.serviceId; }
  fs(serviceId: string) { return new JamFileSystem(this.client, serviceId); }
  async inspect(serviceId: string): Promise<ComputerInspection> { return decodeServiceBytes(await this.client.readService(serviceId, jsonBytes({ op: "service:inspect" }))); }
  async initialize(serviceId: string) {
    const current = await this.account.current();
    if (!current) throw new JamAuthorizationError("Connect an account before initializing the Computer Service");
    if (this.client.isMock) {
      await this.client.invokeService(serviceId, jsonBytes({ op: "computer:init" }), { account: current });
      return;
    }
    await new JamScriptComputerBackend(serviceId, this.account).initialize(current);
  }
  async verify(serviceId: string, account: AccountInfo): Promise<boolean> { try { const inspection = await this.inspect(serviceId); const expectedHash = this.client.isMock ? MOCK_COMPUTER_CODE_HASH : import.meta.env.VITE_COMPUTER_SERVICE_CODE_HASH; const controller = inspection.controller || inspection.owner; const identityMatches = this.client.isMock ? typeof controller === "string" && controller.toLowerCase() === account.address.toLowerCase() : true; return String(inspection.serviceId) === serviceId && inspection.protocolVersion === 1 && inspection.codeHash.toLowerCase() === String(expectedHash).toLowerCase() && identityMatches; } catch { return false; } }
  async current(): Promise<ProvisionedComputer | null> { const account = await this.account.current(); if (!account) return null; const network = await this.client.network(); const genesisHash = network.genesisHash || import.meta.env.VITE_MINIJAM_GENESIS_HASH; if (!genesisHash) return null; const serviceId = readComputerCache(genesisHash, account.address); if (!serviceId) return null; if (!(await this.verify(serviceId, account))) { clearComputerCache(genesisHash, account.address); return null; } return { account, network, serviceId }; }
  async verifyFilesystem(serviceId: string) {
    if (!this.client.isMock) {
      const profile = await new JamScriptComputerBackend(serviceId, this.account).query("getProfile", new Uint8Array([0]));
      if (!profile) throw new JamProtocolError("Computer Service metadata was not initialized", "COMPUTER_METADATA_NOT_INITIALIZED");
      return;
    }
    const fs = this.fs(serviceId);
    for (const path of ["/home", "/home/user", "/home/user/Documents", "/home/user/Projects", "/home/user/Sites", "/home/user/Sites/home"]) {
      const node = await fs.stat(path);
      if (node.type !== "directory") throw new JamProtocolError(`Computer filesystem is missing directory ${path}`, "FILESYSTEM_NOT_INITIALIZED");
    }
  }
  async provision(onProgress?: (progress: ProvisionProgress) => void): Promise<ProvisionedComputer> { const report = (progress: ProvisionProgress) => onProgress?.(progress); report({ step: "account", status: "active" }); const account = (await this.account.current()) || await this.account.connect(); report({ step: "account", status: "done", detail: account.name || account.address }); report({ step: "network", status: "active" }); const network = await this.client.network(); report({ step: "network", status: "done", detail: network.name }); const genesisHash = network.genesisHash || import.meta.env.VITE_MINIJAM_GENESIS_HASH; let serviceId = genesisHash ? readComputerCache(genesisHash, account.address) : null; if (serviceId && !(await this.verify(serviceId, account))) serviceId = null; report({ step: "computer", status: "active" }); if (!serviceId) serviceId = await this.create(); await this.initialize(serviceId); if (!(await this.verify(serviceId, account))) throw new JamProtocolError("The Computer Service failed controller or canonical code verification", "COMPUTER_SERVICE_VERIFICATION_FAILED"); report({ step: "computer", status: "done", detail: `Service #${serviceId}` }); report({ step: "filesystem", status: "active" }); await this.verifyFilesystem(serviceId); if (genesisHash) writeComputerCache(genesisHash, account.address, serviceId); report({ step: "filesystem", status: "done", detail: "Filesystem initialized" }); return { account, network, serviceId }; }
}
