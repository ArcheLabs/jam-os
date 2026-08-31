import {
  FetchRpcTransport,
  JamScriptClient,
  parseHex,
  toHex,
  type CodecValue,
  type DeploymentDescriptor,
  type JamSigner,
} from "@jamscript/minijam-client";
import computerAbi from "../../services/computer/abi/service.abi.json";
import { JamAuthorizationError, JamProtocolError, JamServiceError } from "./errors";
import type { AccountAdapter, AccountInfo } from "./types";
import { accountId32 } from "./accountId";

const COMPUTER_SERVICE_KEY = "0xb5de71cbd87b48abf62a4289172a5c1506c4638869a00f95e4f9b22ef279aba8";

function boundedBytes(value: string, max: number): Uint8Array {
  const encoded = new TextEncoder().encode(value);
  if (encoded.length > max) return encoded.slice(0, max);
  return encoded;
}

function deploymentFor(serviceId: string): DeploymentDescriptor {
  const numericId = Number(serviceId);
  const genesisHash = import.meta.env.VITE_MINIJAM_GENESIS_HASH;
  const codeHash = import.meta.env.VITE_COMPUTER_SERVICE_CODE_HASH;
  const rpcUrl = import.meta.env.VITE_MINIJAM_RPC_URL || import.meta.env.VITE_MINIJAM_NODE_RPC_URL;
  if (!Number.isSafeInteger(numericId) || numericId < 0 || !genesisHash || !codeHash || !rpcUrl) {
    throw new JamProtocolError(
      "Configure the Computer Service ID, genesis hash, code hash, and JamScript RPC before using live metadata",
      "COMPUTER_SERVICE_ABI_NOT_CONFIGURED",
    );
  }
  return {
    genesisHash,
    serviceKey: COMPUTER_SERVICE_KEY,
    serviceId: numericId,
    codeHash,
    abiVersion: 1,
    abi: {
      ...computerAbi,
      abiVersion: (computerAbi as unknown as { abi_version: number }).abi_version,
      languageVersion: (computerAbi as unknown as { language_version: string }).language_version,
    } as DeploymentDescriptor["abi"],
  };
}

export class JamScriptComputerBackend {
  private readonly client: JamScriptClient;

  constructor(serviceId: string, private readonly account: AccountAdapter) {
    const rpcUrl = import.meta.env.VITE_MINIJAM_RPC_URL || import.meta.env.VITE_MINIJAM_NODE_RPC_URL;
    if (!rpcUrl) throw new JamProtocolError("MiniJAM RPC URL is not configured", "MINIJAM_NETWORK_UNAVAILABLE");
    this.client = new JamScriptClient(deploymentFor(serviceId), new FetchRpcTransport(rpcUrl));
  }

  async initialize(account: AccountInfo): Promise<void> {
    const existing = await this.client.queryLatest("getProfile", new Uint8Array([0]));
    if (existing.value !== null) {
      if (!isRecord(existing.value) || !(existing.value.owner instanceof Uint8Array) || !sameBytes(existing.value.owner, accountId32(account.address))) {
        throw new JamAuthorizationError("The Computer Service belongs to another account");
      }
      return;
    }
    const signer = this.signer(account);
    const submitted = await this.client.submitAction(
      "initialize",
      { key: new Uint8Array([0]), displayName: boundedBytes(account.name || "JAM Computer", 32) },
      signer,
    );
    const completed = await this.client.waitForAction(submitted.packageHash, submitted.actionHash);
    if (completed.actionReceipt.status === "applied") return;
    throw new JamServiceError("Computer Service initialize action was rejected", "COMPUTER_INITIALIZE_FAILED", {
      errorCode: completed.actionReceipt.errorCode,
    });
  }

  async query(queryName: string, key: CodecValue): Promise<CodecValue | null> {
    return (await this.client.queryLatest(queryName, key)).value;
  }

  private signer(account: AccountInfo): JamSigner {
    if (!this.account.sign) throw new JamAuthorizationError("The selected account cannot sign Computer actions");
    const sign = this.account.sign;
    return {
      publicKey: accountId32(account.address),
      signRaw: async (message) => parseHex(await sign.call(this.account, toHex(message), { action: "work" })),
    };
  }
}

function isRecord(value: CodecValue): value is { [key: string]: CodecValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Uint8Array);
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
