import { describe, expect, it } from "vitest";
import type { AccountAdapter, AccountInfo, SignContext } from "../../src/jam/types";
import { JamScriptJnsBackend, MockJnsBackend } from "../../src/jam/jnsBackend";
import { encodeJnsName, JamNameService } from "../../src/jam/names";

const alice = { address: `0x${"11".repeat(32)}`, name: "Alice" };
const bob = { address: `0x${"22".repeat(32)}`, name: "Bob" };

class MutableAccount implements AccountAdapter {
  constructor(private value: AccountInfo | null) {}
  sign?: (payloadHex: string, context: SignContext) => Promise<string>;
  use(value: AccountInfo | null) { this.value = value; }
  async current() { return this.value; }
  async connect() { if (!this.value) throw new Error("No account"); return this.value; }
  async disconnect() { this.value = null; }
}

describe("Mock JNS backend", () => {
  it("implements claim, resolve, owner bind, and stable errors", async () => {
    const account = new MutableAccount(alice);
    const names = new JamNameService(new MockJnsBackend(account));

    await expect(names.resolve("missing")).rejects.toMatchObject({ code: "NAME_NOT_FOUND" });
    await expect(names.bind("missing", "1000")).rejects.toMatchObject({ code: "NAME_NOT_FOUND" });

    const claimed = await names.claim("alice", "1000");
    expect(claimed).toMatchObject({ name: "alice", owner: alice.address, serviceId: "1000" });
    await expect(names.claim("alice", "2000")).rejects.toMatchObject({ code: "NAME_TAKEN" });

    expect((await names.bind("alice", "1001")).serviceId).toBe("1001");
    account.use(bob);
    await expect(names.bind("alice", "2000")).rejects.toMatchObject({ code: "NOT_OWNER" });
    expect((await names.resolve("alice")).serviceId).toBe("1001");
  });

  it("derives owner from the current account and ignores forged extra payload", async () => {
    const account = new MutableAccount(alice);
    const backend = new MockJnsBackend(account);
    const claim = backend.claim as unknown as (
      name: Uint8Array,
      serviceId: number,
      payload: { owner: string },
    ) => Promise<void>;

    await claim.call(backend, encodeJnsName("alice"), 1000, { owner: bob.address });
    const entry = await backend.resolve(encodeJnsName("alice"));
    expect(entry?.owner).toEqual(Uint8Array.from({ length: 32 }, () => 0x11));
    expect(entry?.serviceId).toBe(1000);
  });

  it("requires an account for mutations", async () => {
    const names = new JamNameService(new MockJnsBackend(new MutableAccount(null)));
    await expect(names.claim("alice", "1000")).rejects.toMatchObject({ code: "ACCOUNT_SIGNING_UNAVAILABLE" });
  });
});

describe("JamScript JNS backend", () => {
  it("resolves through the proof-backed JamScript client and submits typed actions", async () => {
    const calls: Array<{ action: string; input: Record<string, unknown> }> = [];
    const api = {
      async queryLatest(query: string, name: Uint8Array) {
        expect(query).toBe("resolve");
        expect(name).toEqual(encodeJnsName("alice"));
        return {
          value: { owner: Uint8Array.from({ length: 32 }, () => 0x11), serviceId: 1000 },
          context: {} as never,
          stateRoot: "0x00",
        };
      },
      async submitAction(action: string, input: Record<string, unknown>) {
        calls.push({ action, input });
        return { packageHash: "0x01", submissionHash: "0x02", context: {} as never };
      },
      async waitForWork() {
        return { status: "imported" } as never;
      },
    };
    const account = new MutableAccount(alice);
    account.sign = async () => "0x" + "33".repeat(64);
    const backend = new JamScriptJnsBackend(api, account);

    await expect(backend.resolve(encodeJnsName("alice"))).resolves.toMatchObject({ serviceId: 1000 });
    await backend.claim(encodeJnsName("alice"), 1001);
    expect(calls[0]).toMatchObject({ action: "claim", input: { serviceId: 1001 } });
  });
});
