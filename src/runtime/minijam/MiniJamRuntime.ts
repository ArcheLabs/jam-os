import { BrowserAccountAdapter } from "../../jam/account";
import { ComputerService } from "../../jam/computer";
import { RealJamClient } from "../../jam/JamClient";
import { JamNameService } from "../../jam/names";
import { RealPlaygroundAdapter } from "../../jam/playground";
import { MiniJamTransport } from "../../jam/transport";
import type { AccountInfo, AccountAdapter, JamClient, PlaygroundAdapter } from "../../jam/types";
import type { ComputerRuntime, DoomRuntime, EventRuntime, FileSystemRuntime, JamOsRuntimeV2, NameRuntime, NetworkRuntime, PlaygroundRuntime, ServiceRuntime, WorkRuntime } from "../types";
import { MiniJamApiClient } from "./MiniJamApiClient";
import { LiveFileSystemRuntime } from "./LiveFileSystemRuntime";
import { LiveWorkRuntime } from "./LiveWorkRuntime";
import { MiniJamDoomRuntime } from "../doom/MiniJamDoomRuntime";

class LiveEvents implements EventRuntime {
  private listeners = new Map<string, Set<(payload: unknown) => void>>();
  subscribe(event: string, callback: (payload: unknown) => void) {
    const listeners = this.listeners.get(event) || new Set<(payload: unknown) => void>();
    listeners.add(callback);
    this.listeners.set(event, listeners);
    return () => listeners.delete(callback);
  }
  emit(event: string, payload: unknown) { this.listeners.get(event)?.forEach((callback) => callback(payload)); }
}

/** Live adapter is intentionally parallel to MockJamOsRuntime. No capability falls through to preview data. */
export class MiniJamRuntime implements JamOsRuntimeV2 {
  readonly mode = "live" as const;
  readonly account: AccountAdapter = new BrowserAccountAdapter();
  private readonly transport = new MiniJamTransport();
  private readonly client: JamClient = new RealJamClient(this.transport, this.account);
  private readonly api = new MiniJamApiClient(this.transport);
  private readonly playgroundAdapter: PlaygroundAdapter = new RealPlaygroundAdapter(this.transport, this.account);
  private readonly computerAdapter = new ComputerService(this.client, this.account, this.playgroundAdapter);
  private readonly namesAdapter = new JamNameService(this.client, this.account);
  private readonly liveEvents = new LiveEvents();
  readonly computer: ComputerRuntime = { current: () => this.computerAdapter.current(), provision: (onProgress) => this.computerAdapter.provision(onProgress), inspect: (id) => this.computerAdapter.inspect(id) };
  readonly playground: PlaygroundRuntime = this.playgroundAdapter;
  readonly events: EventRuntime = this.liveEvents;
  readonly work: WorkRuntime = new LiveWorkRuntime(this.api, this.account, this.events);
  readonly fs: FileSystemRuntime = new LiveFileSystemRuntime(this.api, this.work);
  readonly doom: DoomRuntime = new MiniJamDoomRuntime({ api: this.api, work: this.work, account: this.account, serviceId: import.meta.env.VITE_DOOM_SERVICE_ID, gatewayUrl: import.meta.env.VITE_DOOM_GATEWAY_URL });
  readonly system: JamOsRuntimeV2["system"] = { getInfo: async () => { const network = await this.network.getInfo(); return { osVersion: "0.1", networkName: network.name, status: network.healthy ? "online" as const : "offline" as const }; } };
  readonly network: NetworkRuntime = { getInfo: async () => { try { const network = await this.client.network(); const info = { ...network, source: "real" as const }; this.liveEvents.emit("network:online", info); return info; } catch { const info = { name: import.meta.env.VITE_MINIJAM_NETWORK_NAME || "MiniJAM Testnet", endpoint: this.transport.base || "unconfigured", healthy: false, source: "unavailable" as const }; this.liveEvents.emit("network:offline", info); return info; } } };
  readonly services: ServiceRuntime = { list: async () => { try { const current = await this.computerAdapter.current(); return [{ id: "computer", name: "Computer Service", status: current ? "running" as const : "stopped" as const, source: current ? "real" as const : "unavailable" as const }]; } catch { return [{ id: "computer", name: "Computer Service", status: "stopped" as const, source: "unavailable" as const }]; } }, inspect: (id: string) => this.computerAdapter.inspect(id), call: async (id: string, payload: Uint8Array, account?: AccountInfo | null) => (await this.client.invokeService(id, payload, { account })).output };
  readonly names: NameRuntime = { resolve: (name: string) => this.namesAdapter.resolve(name), claim: (name: string, id: string) => this.namesAdapter.claim(name, id), bind: (name: string, id: string) => this.namesAdapter.bind(name, id) };
}
