import { describe, expect, it } from "vitest";
import { chunkBytes, normalizePath, reassembleChunks } from "../../src/protocols/jamFs";
import { canonicalizeUrl, parseJamUri } from "../../src/protocols/jamUri";
import { decodeJnsName, encodeJnsName, isCanonicalJnsName, parseJnsServiceId, validateName } from "../../src/jam/names";
import { parseCommand } from "../../src/shell/parser";
import { base64ToBytes, bytesToBase64 } from "../../src/jam/encoding";
import { jsonBytes, parseBytes } from "../../src/jam/JamClient";

describe("JAM protocol helpers", () => {
  it("normalizes absolute and home-relative paths without traversal", () => {
    expect(normalizePath("./Sites/../Documents/a.txt", "/home/user")).toBe("/home/user/Documents/a.txt");
    expect(normalizePath("/home//user/./notes.txt")).toBe("/home/user/notes.txt");
    expect(() => normalizePath("../../../secret", "/home/user")).toThrow();
  });
  it("parses native JAM URLs", () => {
    expect(parseJamUri("jam://alice/about.html")).toEqual({ raw: "jam://alice/about.html", name: "alice", path: "/about.html" });
    expect(canonicalizeUrl("alice")).toBe("jam://alice");
  });
  it("normalizes and validates JNS names at the browser boundary", () => {
    for (const name of ["abc", "alice", "alice-1", "a1b", "a".repeat(32)]) {
      expect(decodeJnsName(encodeJnsName(name))).toBe(name);
    }
    expect(validateName("Alice-1")).toBe("alice-1");
    for (const name of ["", "ab", "a".repeat(33), "-leading", "trailing-", "a_b", "a.b", "猫", "中文", "😀"]) {
      expect(() => validateName(name)).toThrow();
    }
  });
  it("rejects non-canonical bytes at the Service boundary", () => {
    expect(isCanonicalJnsName(new TextEncoder().encode("alice-1"))).toBe(true);
    expect(isCanonicalJnsName(new TextEncoder().encode("Alice"))).toBe(false);
    expect(isCanonicalJnsName(new TextEncoder().encode("-alice"))).toBe(false);
    expect(() => decodeJnsName(new TextEncoder().encode("Alice"))).toThrow();
  });
  it("converts the existing string Service ID API to canonical u32", () => {
    expect(parseJnsServiceId("0")).toBe(0);
    expect(parseJnsServiceId("4294967295")).toBe(0xffff_ffff);
    for (const value of ["-1", "1.5", "4294967296", "abc", ""]) expect(() => parseJnsServiceId(value)).toThrow();
  });
  it("supports simple shell quoting", () => { expect(parseCommand('write notes.txt "hello world"')).toEqual(["write", "notes.txt", "hello world"]); });
  it("round-trips binary content through chunks", () => { const value = new Uint8Array([0, 1, 2, 255, 4]); expect([...reassembleChunks(chunkBytes(value, 2))]).toEqual([...value]); });
  it("round-trips arbitrary UTF-8 and binary bytes through base64", () => { const value = new TextEncoder().encode("你好 JAM\u0000\uffff"); expect([...base64ToBytes(bytesToBase64(value))]).toEqual([...value]); });
  it("emits versioned service request envelopes", () => { expect(parseBytes(jsonBytes({ op: "fs:read", path: "/hello" }))).toEqual({ v: 1, op: "fs:read", path: "/hello" }); });
});
