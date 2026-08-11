import { describe, expect, it } from "vitest";
import { chunkBytes, normalizePath, reassembleChunks } from "../../src/protocols/jamFs";
import { canonicalizeUrl, parseJamUri } from "../../src/protocols/jamUri";
import { validateName } from "../../src/jam/names";
import { parseCommand } from "../../src/shell/parser";

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
  it("enforces JNS names", () => { expect(validateName("Alice-1")).toBe("alice-1"); expect(() => validateName("a")).toThrow(); expect(() => validateName("bad_name")).toThrow(); });
  it("supports simple shell quoting", () => { expect(parseCommand('write notes.txt "hello world"')).toEqual(["write", "notes.txt", "hello world"]); });
  it("round-trips binary content through chunks", () => { const value = new Uint8Array([0, 1, 2, 255, 4]); expect([...reassembleChunks(chunkBytes(value, 2))]).toEqual([...value]); });
});
