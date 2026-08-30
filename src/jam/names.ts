import { JamProtocolError, JnsInvalidNameError, JnsNameNotFoundError } from "./errors";
import { jnsBackendFor, type JnsBackend, type JnsEntry } from "./jnsBackend";
import type { AccountAdapter, JamClient, JnsRecord } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function validateName(name: string): string {
  const normalized = name.toLowerCase();
  if (
    normalized.length < 3
    || normalized.length > 32
    || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalized)
  ) {
    throw new JnsInvalidNameError("Names use 3–32 lowercase ASCII letters, digits, and hyphens");
  }
  return normalized;
}

export function isCanonicalJnsName(name: Uint8Array): boolean {
  if (name.length < 3 || name.length > 32 || name[0] === 45 || name[name.length - 1] === 45) return false;
  return name.every((value) => (
    (value >= 97 && value <= 122)
    || (value >= 48 && value <= 57)
    || value === 45
  ));
}

export function encodeJnsName(name: string): Uint8Array {
  const encoded = encoder.encode(validateName(name));
  if (!isCanonicalJnsName(encoded)) throw new JnsInvalidNameError();
  return encoded;
}

export function decodeJnsName(name: Uint8Array): string {
  if (!isCanonicalJnsName(name)) throw new JnsInvalidNameError();
  try {
    return decoder.decode(name);
  } catch {
    throw new JnsInvalidNameError();
  }
}

export function parseJnsServiceId(serviceId: string): number {
  if (!/^[0-9]+$/.test(serviceId)) {
    throw new JamProtocolError("JNS service ID must be a u32", "INVALID_SERVICE_ID");
  }
  const parsed = Number(serviceId);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 0xffff_ffff) {
    throw new JamProtocolError("JNS service ID must be a u32", "INVALID_SERVICE_ID");
  }
  return parsed;
}

function ownerHex(owner: Uint8Array): string {
  return `0x${Array.from(owner, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function record(name: string, entry: JnsEntry): JnsRecord {
  return {
    version: 1,
    name,
    owner: ownerHex(entry.owner),
    serviceId: String(entry.serviceId),
  };
}

export class JamNameService {
  private readonly backend: JnsBackend;

  constructor(backend: JnsBackend);
  constructor(client: JamClient, account: AccountAdapter);
  constructor(clientOrBackend: JamClient | JnsBackend, account?: AccountAdapter) {
    if ("network" in clientOrBackend) {
      if (!account) throw new Error("JNS client construction requires an account adapter");
      this.backend = jnsBackendFor(clientOrBackend, account);
    } else {
      this.backend = clientOrBackend;
    }
  }

  async resolve(name: string): Promise<JnsRecord> {
    const normalized = validateName(name);
    const entry = await this.backend.resolve(encodeJnsName(normalized));
    if (!entry) throw new JnsNameNotFoundError();
    return record(normalized, entry);
  }

  record(name: string): Promise<JnsRecord> { return this.resolve(name); }
  show(name: string): Promise<JnsRecord> { return this.record(name); }

  async claim(name: string, serviceId: string): Promise<JnsRecord> {
    const normalized = validateName(name);
    await this.backend.claim(encodeJnsName(normalized), parseJnsServiceId(serviceId));
    return this.resolve(normalized);
  }

  async bind(name: string, serviceId: string): Promise<JnsRecord> {
    const normalized = validateName(name);
    await this.backend.bind(encodeJnsName(normalized), parseJnsServiceId(serviceId));
    return this.resolve(normalized);
  }
}
