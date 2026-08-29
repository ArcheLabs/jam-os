import fs from "node:fs";
import { describe, expect, it } from "vitest";

const abi = JSON.parse(fs.readFileSync(
  new URL("../../services/jns/abi/service.abi.json", import.meta.url),
  "utf8",
));
const source = fs.readFileSync(
  new URL("../../services/jns/src/service.ts", import.meta.url),
  "utf8",
);

describe("canonical JNS Service artifact", () => {
  it("contains only the product actions, query, and state schema", () => {
    expect(abi.abi_version).toBe(1);
    expect(abi.language_version).toBe("0.2");
    expect(abi.actions.map((action: { name: string }) => action.name)).toEqual(["claim", "bind"]);
    expect(abi.queries.map((query: { name: string }) => query.name)).toEqual(["resolve"]);
    expect(abi.state).toHaveLength(1);
    expect(abi.state[0]).toMatchObject({
      name: "names",
      schema: "jns.names/v1",
      kind: "map",
      keyType: { kind: "bytes", max: 32 },
      valueType: {
        kind: "record",
        fields: [
          { name: "owner", type: { kind: "address" } },
          { name: "serviceId", type: { kind: "u32" } },
        ],
      },
    });
  });

  it("derives ownership from ctx.sender and has no browser owner input", () => {
    expect(source).toContain("owner: ctx.sender");
    expect(source).not.toContain("input.owner");
    expect(source).not.toContain("reverseLookup");
  });
});
