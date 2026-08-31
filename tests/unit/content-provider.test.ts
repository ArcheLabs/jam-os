import { describe, expect, it } from "vitest";
import { encodeAddress } from "@polkadot/util-crypto";
import { HttpContentProvider, MemoryContentProvider, contentRoot, contentRefFromJson, contentUploadPermitDigest } from "../../src/jam/contentProvider";

describe("content-addressed provider", () => {
  it("stores and verifies content by Blake2-256 root", async () => {
    const provider = new MemoryContentProvider();
    const bytes = new TextEncoder().encode("hello JAM");
    const ref = await provider.put(bytes);
    expect(ref).toEqual({ version: 1, root: contentRoot(bytes), size: bytes.length });
    expect(await provider.has(ref)).toBe(true);
    expect(await provider.get(ref)).toEqual(bytes);
  });

  it("fails closed when a provider object is tampered with", async () => {
    const provider = new MemoryContentProvider();
    const ref = await provider.put(new Uint8Array([1, 2, 3]));
    const tampered = { ...ref, root: `0x${"00".repeat(32)}` };
    await expect(provider.get(tampered)).rejects.toThrow("CONTENT_NOT_FOUND");
  });

  it("validates provider-neutral references", () => {
    expect(contentRefFromJson({ version: 1, root: `0x${"ab".repeat(32)}`, size: 4 })).toEqual({ version: 1, root: `0x${"ab".repeat(32)}`, size: 4 });
    expect(() => contentRefFromJson({ version: 2, root: "https://bucket/object", size: 4 })).toThrow("INVALID_CONTENT_REF");
  });

  it("builds a domain-separated wallet upload permit digest", () => {
    const domain = new Uint8Array(32).fill(1);
    const account = new Uint8Array(32).fill(2);
    const root = new Uint8Array(32).fill(3);
    const first = contentUploadPermitDigest(domain, account, root, 9, 100);
    expect(first).toHaveLength(32);
    expect(contentUploadPermitDigest(domain, account, root, 9, 101)).not.toEqual(first);
  });

  it("matches the provider's parameterized BLAKE2b-256 vector", () => {
    expect(contentRoot(new TextEncoder().encode("abc"))).toBe("0xbddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319");
  });

  it("normalizes an SS58 wallet address in upload permits", async () => {
    const accountBytes = new Uint8Array(32).fill(7);
    const address = encodeAddress(accountBytes, 42);
    let requestHeaders: Record<string, string> | undefined;
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      requestHeaders = init?.headers as Record<string, string>;
      const body = JSON.stringify({ version: 1, root: contentRoot(new TextEncoder().encode("ss58")), size: 4 });
      return new Response(body, { status: 201 });
    }) as typeof fetch;
    try {
      const provider = new HttpContentProvider("http://provider", 1024, {
        account: {
          current: async () => ({ address, name: "test", type: "sr25519" }),
          connect: async () => ({ address, name: "test", type: "sr25519" }),
          disconnect: async () => undefined,
          sign: async () => `0x${"11".repeat(64)}`,
        },
        providerDomain: `0x${"22".repeat(32)}`,
      });
      await provider.put(new TextEncoder().encode("ss58"));
      expect(requestHeaders?.["x-jam-account"]).toBe(`0x${"07".repeat(32)}`);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
