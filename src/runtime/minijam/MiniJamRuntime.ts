import { BrowserAccountAdapter } from "../../jam/account";
import { ComputerService } from "../../jam/computer";
import { RealJamClient } from "../../jam/JamClient";
import { JamNameService } from "../../jam/names";
import { RealPlaygroundAdapter } from "../../jam/playground";
import { MiniJamTransport } from "../../jam/transport";
import type { RuntimeCompatibility } from "../types";
import type { DoomInput, DoomRuntime, DoomLeaderboardEntry, DoomSession, DoomResult, DoomStartOptions } from "../types";
import { MockJamOsRuntime } from "../mock/MockJamOsRuntime";

/** Live adapter. The V2 surface is stable while the existing protocol client remains behind it. */
export class MiniJamRuntime extends MockJamOsRuntime implements RuntimeCompatibility {
  override readonly mode = "live" as const;
  override readonly account = new BrowserAccountAdapter();
  override readonly client = new RealJamClient(new MiniJamTransport(), this.account);
  override readonly playground = new RealPlaygroundAdapter(new MiniJamTransport(), this.account);
  override readonly computer = new ComputerService(this.client, this.account, this.playground);
  override readonly namesService = new JamNameService(this.client, this.account);
  override readonly network = { getInfo: async () => { const network = await this.client.network(); return { ...network, source: "real" as const }; } };
  override readonly system = { getInfo: async () => ({ osVersion: "0.1", networkName: (await this.client.network()).name, status: "online" as const }) };
  override readonly services = { list: async () => [{ id: "computer", name: "Computer Service", status: "running" as const, source: "real" as const }], inspect: (id: string) => this.computer.inspect(id), call: async (id: string, payload: Uint8Array, account?: import("../../jam/types").AccountInfo | null) => (await this.client.invokeService(id, payload, { account })).output };
  override readonly doom: DoomRuntime = new UnavailableDoom();
  override readonly names = { resolve: (name: string) => this.namesService.resolve(name), claim: (name: string, id: string) => this.namesService.claim(name, id), bind: (name: string, id: string) => this.namesService.bind(name, id) };
}

class UnavailableDoom implements DoomRuntime {
  async status() { return "unavailable" as const; }
  async start(_options?: DoomStartOptions): Promise<DoomSession> { throw new Error("PVM DOOM runtime is not connected"); }
  async input(_sessionId: string, _input: DoomInput) { throw new Error("PVM DOOM runtime is not connected"); }
  async stop(_sessionId: string): Promise<DoomResult> { throw new Error("PVM DOOM runtime is not connected"); }
  async leaderboard(): Promise<DoomLeaderboardEntry[]> { return []; }
}
