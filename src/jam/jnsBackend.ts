import {
  JamAuthorizationError,
  JnsNameNotFoundError,
  JnsNameTakenError,
  JnsNotConfiguredError,
  JnsNotOwnerError,
  JamServiceError,
} from "./errors";
import type { AccountAdapter, JamClient } from "./types";
import {
  FetchRpcTransport,
  JamScriptClient,
  parseHex,
  toHex,
  type CodecValue,
  type DeploymentDescriptor,
  type JamSigner,
} from "@jamscript/minijam-client";
import jnsAbi from "../../services/jns/abi/service.abi.json";

export interface JnsEntry {
  owner: Uint8Array;
  serviceId: number;
}

export interface JnsBackend {
  resolve(name: Uint8Array): Promise<JnsEntry | null>;
  claim(name: Uint8Array, serviceId: number): Promise<void>;
  bind(name: Uint8Array, serviceId: number): Promise<void>;
}

const mockStores = new WeakMap<object, Map<string, JnsEntry>>();
const MOCK_STORAGE_KEY = "jam-jns-mock-v1";

function bytesKey(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function loadMockEntries(): Map<string, JnsEntry> {
  try {
    const saved = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!saved) return new Map();
    const snapshot = JSON.parse(saved) as Record<string, { owner: number[]; serviceId: number }>;
    return new Map(Object.entries(snapshot).map(([key, entry]) => [
      key,
      { owner: Uint8Array.from(entry.owner), serviceId: entry.serviceId },
    ]));
  } catch {
    return new Map();
  }
}

function saveMockEntries(entries: Map<string, JnsEntry>): void {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(Object.fromEntries(
      [...entries].map(([key, entry]) => [key, {
        owner: [...entry.owner],
        serviceId: entry.serviceId,
      }]),
    )));
  } catch {
    // Mock persistence is optional in restricted/private browser contexts.
  }
}

function accountBytes(address: string): Uint8Array {
  if (/^0x[0-9a-fA-F]{64}$/.test(address)) {
    return Uint8Array.from(address.slice(2).match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
  }
  const encoded = new TextEncoder().encode(address);
  if (encoded.length > 32) throw new JamAuthorizationError("Account address is not a 32-byte identity");
  const output = new Uint8Array(32);
  output.set(encoded);
  return output;
}

async function currentOwner(account: AccountAdapter): Promise<Uint8Array> {
  const current = await account.current();
  if (!current) throw new JamAuthorizationError("Connect an account first");
  return accountBytes(current.address);
}

export class MockJnsBackend implements JnsBackend {
  constructor(
    private readonly account: AccountAdapter,
    private readonly entries = new Map<string, JnsEntry>(),
    private readonly persist: (entries: Map<string, JnsEntry>) => void = () => undefined,
  ) {}

  async resolve(name: Uint8Array): Promise<JnsEntry | null> {
    const entry = this.entries.get(bytesKey(name));
    return entry ? { owner: entry.owner.slice(), serviceId: entry.serviceId } : null;
  }

  async claim(name: Uint8Array, serviceId: number): Promise<void> {
    const key = bytesKey(name);
    const owner = await currentOwner(this.account);
    if (this.entries.has(key)) throw new JnsNameTakenError();
    this.entries.set(key, { owner, serviceId });
    this.persist(this.entries);
  }

  async bind(name: Uint8Array, serviceId: number): Promise<void> {
    const key = bytesKey(name);
    const current = this.entries.get(key);
    if (!current) throw new JnsNameNotFoundError();
    const owner = await currentOwner(this.account);
    if (!equalBytes(current.owner, owner)) throw new JnsNotOwnerError();
    this.entries.set(key, { owner: current.owner, serviceId });
    this.persist(this.entries);
  }
}

class DisabledJnsBackend implements JnsBackend {
  private unavailable(): never { throw new JnsNotConfiguredError(); }
  async resolve(_name: Uint8Array): Promise<JnsEntry | null> { return this.unavailable(); }
  async claim(_name: Uint8Array, _serviceId: number): Promise<void> { this.unavailable(); }
  async bind(_name: Uint8Array, _serviceId: number): Promise<void> { this.unavailable(); }
}

type JamScriptJnsApi = Pick<JamScriptClient, "queryLatest" | "submitAction" | "waitForWork">;

/** Live JNS adapter. The deployment is configured separately from Service identity. */
export class JamScriptJnsBackend implements JnsBackend {
  constructor(
    private readonly client: JamScriptJnsApi,
    private readonly account: AccountAdapter,
  ) {}

  async resolve(name: Uint8Array): Promise<JnsEntry | null> {
    const result = await this.client.queryLatest("resolve", name);
    if (result.value === null) return null;
    if (!isRecord(result.value) || !(result.value.owner instanceof Uint8Array)) {
      throw new JamServiceError("JNS returned an invalid resolve record", "JNS_INVALID_RECORD");
    }
    const serviceId = result.value.serviceId;
    if (typeof serviceId !== "number" || !Number.isSafeInteger(serviceId) || serviceId < 0) {
      throw new JamServiceError("JNS returned an invalid Service ID", "JNS_INVALID_RECORD");
    }
    return { owner: result.value.owner.slice(), serviceId };
  }

  async claim(name: Uint8Array, serviceId: number): Promise<void> {
    await this.submit("claim", name, serviceId);
  }

  async bind(name: Uint8Array, serviceId: number): Promise<void> {
    await this.submit("bind", name, serviceId);
  }

  private async submit(action: "claim" | "bind", name: Uint8Array, serviceId: number): Promise<void> {
    const account = await this.account.current();
    if (!account) throw new JamAuthorizationError("Connect an account before changing JNS state");
    const signature = this.account.sign;
    if (!signature) throw new JamAuthorizationError("The selected account cannot sign JNS actions");
    const signer: JamSigner = {
      publicKey: accountBytes(account.address),
      signRaw: async (message) => parseHex(await signature.call(this.account, toHex(message), { action: "work" })),
    };
    const submitted = await this.client.submitAction(action, { name, serviceId }, signer);
    const completed = await this.client.waitForWork(submitted.packageHash);
    if (completed.status === "failed") {
      throw new JamServiceError("JNS action was rejected by the canonical Service", "JNS_ACTION_REJECTED");
    }
  }
}

function isRecord(value: CodecValue): value is { [key: string]: CodecValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Uint8Array);
}

const JNS_SERVICE_KEY = "0xab0031fac2d12cb21f0a539f9860d5f0cb9a4e1caba011071991b20b357de66e";

function configuredJamScriptBackend(account: AccountAdapter): JnsBackend | null {
  const serviceId = Number(import.meta.env.VITE_JNS_SERVICE_ID);
  const genesisHash = import.meta.env.VITE_MINIJAM_GENESIS_HASH;
  const codeHash = import.meta.env.VITE_JNS_SERVICE_CODE_HASH;
  const rpcUrl = import.meta.env.VITE_MINIJAM_RPC_URL;
  if (!Number.isSafeInteger(serviceId) || serviceId < 0 || !genesisHash || !codeHash || !rpcUrl) return null;
  const deployment: DeploymentDescriptor = {
    genesisHash,
    serviceKey: JNS_SERVICE_KEY,
    serviceId,
    codeHash,
    abiVersion: 1,
    abi: {
      ...jnsAbi,
      abiVersion: (jnsAbi as unknown as { abi_version: number }).abi_version,
      languageVersion: (jnsAbi as unknown as { language_version: string }).language_version,
    } as DeploymentDescriptor["abi"],
  };
  return new JamScriptJnsBackend(
    new JamScriptClient(deployment, new FetchRpcTransport(rpcUrl)),
    account,
  );
}

export function jnsBackendFor(client: JamClient, account: AccountAdapter): JnsBackend {
  if (!client.isMock) return configuredJamScriptBackend(account) ?? new DisabledJnsBackend();
  let entries = mockStores.get(client);
  if (!entries) {
    entries = loadMockEntries();
    mockStores.set(client, entries);
  }
  return new MockJnsBackend(account, entries, saveMockEntries);
}
