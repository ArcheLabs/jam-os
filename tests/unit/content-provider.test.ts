import { describe, expect, it } from "vitest";
import { MemoryContentProvider, contentRoot, contentRefFromJson } from "../../src/jam/contentProvider";

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
});
