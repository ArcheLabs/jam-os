import { describe, expect, it } from "vitest";
import { MockAccountAdapter } from "../../src/jam/account";
import { ComputerService } from "../../src/jam/computer";
import { MockJamClient } from "../../src/jam/MockJamClient";
import { JamNameService } from "../../src/jam/names";

describe("mock JAM vertical slice", () => {
  it("persists a file and serves a published JAM page", async () => {
    const client = new MockJamClient();
    const account = new MockAccountAdapter(client);
    const computer = new ComputerService(client, account);
    const names = new JamNameService(client, account);
    const serviceId = await computer.create();
    const fs = computer.fs(serviceId);
    await fs.write("/home/user/Sites/home/index.html", "<h1>Stored on JAM</h1>", "text/html");
    await names.claim("alice", serviceId);
    const manifest = await fs.publish();
    expect(manifest.files["/index.html"]).toBeTruthy();
    expect((await names.resolve("alice")).serviceId).toBe(serviceId);
    expect(new TextDecoder().decode((await fs.readPublished("/index.html")).bytes)).toContain("Stored on JAM");
  });
});
