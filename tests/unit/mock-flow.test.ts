import { describe, expect, it } from "vitest";
import { MockAccountAdapter } from "../../src/jam/account";
import { ComputerService } from "../../src/jam/computer";
import { MockJamClient } from "../../src/jam/MockJamClient";
import { JamNameService } from "../../src/jam/names";
import { resolveBrowserUrl } from "../../src/apps/browser/protocolRouter";

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
  it("reads the resolved service, not the local Computer Service", async () => {
    const client = new MockJamClient();
    const account = new MockAccountAdapter(client);
    const computer = new ComputerService(client, account);
    const names = new JamNameService(client, account);
    const alice = await computer.create();
    const bob = await computer.create();
    const aliceFs = computer.fs(alice);
    const bobFs = computer.fs(bob);
    await aliceFs.write("/home/user/Sites/home/index.html", "<h1>ALICE</h1>", "text/html");
    await bobFs.write("/home/user/Sites/home/index.html", "<h1>BOB</h1>", "text/html");
    await aliceFs.publish();
    await bobFs.publish();
    await names.claim("alice", alice);
    await names.claim("bob", bob);
    const alicePage = await resolveBrowserUrl("jam://alice", { localFs: bobFs, names, siteForService: (id) => computer.fs(id) });
    const bobPage = await resolveBrowserUrl("jam://bob", { localFs: bobFs, names, siteForService: (id) => computer.fs(id) });
    expect(alicePage.srcdoc).toContain("ALICE");
    expect(alicePage.srcdoc).not.toContain("BOB");
    expect(bobPage.srcdoc).toContain("BOB");
  });
  it("sanitizes page-authored scripts before browser rendering", async () => {
    const client = new MockJamClient();
    const account = new MockAccountAdapter(client);
    const computer = new ComputerService(client, account);
    const names = new JamNameService(client, account);
    const serviceId = await computer.create();
    const fs = computer.fs(serviceId);
    await fs.write("/home/user/Sites/home/index.html", "<script>alert(1)</script><h1>safe</h1>", "text/html");
    await fs.publish();
    await names.claim("safe", serviceId);
    const page = await resolveBrowserUrl("jam://safe", { localFs: fs, names, siteForService: (id) => computer.fs(id) });
    expect(page.srcdoc).not.toContain("alert(1)");
    expect(page.srcdoc).toContain("safe");
  });
});
