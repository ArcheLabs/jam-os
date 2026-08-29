import {
  JamAuthorizationError,
  JnsNameNotFoundError,
  JnsNameTakenError,
  JnsNotConfiguredError,
  JnsNotOwnerError,
} from "./errors";
import type { AccountAdapter, JamClient } from "./types";

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

export function jnsBackendFor(client: JamClient, account: AccountAdapter): JnsBackend {
  if (!client.isMock) return new DisabledJnsBackend();
  let entries = mockStores.get(client);
  if (!entries) {
    entries = loadMockEntries();
    mockStores.set(client, entries);
  }
  return new MockJnsBackend(account, entries, saveMockEntries);
}
