import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { blake2AsHex } from "@polkadot/util-crypto";

const abi = JSON.parse(fs.readFileSync(
  new URL("../../services/computer/abi/service.abi.json", import.meta.url),
  "utf8",
)) as {
  abi_version: number;
  language_version: string;
  actions: Array<{ name: string }>;
  queries: Array<{ name: string }>;
  state: Array<{ schema: string }>;
};
const source = fs.readFileSync(
  new URL("../../services/computer/src/service.ts", import.meta.url),
  "utf8",
);
const computerClient = fs.readFileSync(
  new URL("../../src/jam/computer.ts", import.meta.url),
  "utf8",
);
const blob = fs.readFileSync(
  new URL("../../artifacts/computer/stage1/scriptc/service.blob", import.meta.url),
);

describe("canonical Computer JamScript artifact", () => {
  it("contains the bounded control-plane actions and queries", () => {
    expect(abi.abi_version).toBe(1);
    expect(abi.language_version).toBe("0.2");
    expect(abi.actions.map((action) => action.name)).toEqual([
      "initialize",
      "setProfile",
      "setAppearance",
      "upsertDesktopIcon",
      "removeDesktopIcon",
      "setNodeMetadata",
      "removeNodeMetadata",
      "publishSite",
    ]);
    expect(abi.queries.map((query) => query.name)).toEqual([
      "getProfile",
      "getAppearance",
      "getDesktopIcon",
      "getNodeMetadata",
      "getSiteManifest",
    ]);
    expect(abi.state.map((entry) => entry.schema)).toEqual([
      "computer.profile/v1",
      "computer.appearance/v1",
      "computer.desktop-icons/v1",
      "computer.nodes/v1",
      "computer.site-manifest/v1",
    ]);
  });

  it("derives ownership from ctx.sender and stores only content references", () => {
    expect(source).toContain("owner: ctx.sender");
    expect(source).toContain("sameAddress(current.owner, sender)");
    expect(source).not.toContain("input.owner");
    expect(source).not.toContain("storage_write");
    expect(source).toContain("const ContentRoot = bytes(32)");
  });

  it("matches the promoted content-addressed production blob", () => {
    expect(blake2AsHex(blob, 256)).toBe("0xb8ae2888af4b0a73b93016580202e8fa2abdb4b971e17f9b40460994468198b9");
  });

  it("keeps live Computer deployment independent from Playground", () => {
    expect(computerClient).not.toContain("PlaygroundAdapter");
    expect(computerClient).not.toContain("this.playground.deploy");
    expect(computerClient).toContain("Stage-1 deployment client");
  });
});
