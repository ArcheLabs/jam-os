import { decodeDoomFrame, encodeDoomFrame, serializeDoomInput } from "./frame";
import { DoomRuntimeError } from "./errors";
import type { DoomCheckpoint, DoomFrame, DoomInput, DoomRealtimeSession, DoomRealtimeStatus, DoomUnsubscribe } from "./types";

export const DOOM_REALTIME_PROTOCOL_VERSION = 1;
export type DoomTransportMessage = string | Uint8Array;
export interface DoomTransport {
  connect(sessionId: string): Promise<void>;
  send(message: DoomTransportMessage): void;
  subscribe(callback: (message: DoomTransportMessage) => void): DoomUnsubscribe;
  close(): Promise<void>;
}

type GatewayMessage =
  | { version: 1; type: "ready"; sessionId: string }
  | { version: 1; type: "checkpoint"; checkpoint: DoomCheckpoint }
  | { version: 1; type: "error"; code: string; message: string }
  | { version: 1; type: "status"; status: DoomRealtimeStatus };

function controlMessage(message: object): string { return JSON.stringify({ version: DOOM_REALTIME_PROTOCOL_VERSION, ...message }); }
function isBinary(message: DoomTransportMessage): message is Uint8Array { return message instanceof Uint8Array; }

export class WebSocketDoomTransport implements DoomTransport {
  private socket: WebSocket | null = null;
  private listeners = new Set<(message: DoomTransportMessage) => void>();
  constructor(private readonly url: string, private readonly permit?: unknown) {}

  connect(sessionId: string): Promise<void> {
    if (typeof WebSocket === "undefined") return Promise.reject(new DoomRuntimeError("SERVICE_UNAVAILABLE", "WebSocket is unavailable in this browser"));
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      socket.binaryType = "arraybuffer";
      this.socket = socket;
      socket.onopen = () => { this.send(controlMessage(this.permit ? { type: "run", runId: sessionId, ...this.permit as object } : { type: "connect", sessionId })); resolve(); };
      socket.onerror = () => reject(new DoomRuntimeError("SERVICE_UNAVAILABLE", "DOOM gateway connection failed"));
      socket.onclose = () => this.listeners.forEach((listener) => listener(JSON.stringify({ version: 1, type: "status", status: "disconnected" })));
      socket.onmessage = (event) => {
        if (typeof event.data === "string") this.listeners.forEach((listener) => listener(event.data));
        else if (event.data instanceof ArrayBuffer) this.listeners.forEach((listener) => listener(new Uint8Array(event.data)));
        else if (event.data instanceof Blob) void event.data.arrayBuffer().then((bytes) => this.listeners.forEach((listener) => listener(new Uint8Array(bytes))));
      };
    });
  }

  send(message: DoomTransportMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) throw new DoomRuntimeError("SERVICE_UNAVAILABLE", "DOOM gateway is not connected");
    this.socket.send(isBinary(message) ? message : message);
  }

  subscribe(callback: (message: DoomTransportMessage) => void): DoomUnsubscribe { this.listeners.add(callback); return () => this.listeners.delete(callback); }
  async close() { this.socket?.close(); this.socket = null; }
}

export class WebSocketDoomRealtimeSession implements DoomRealtimeSession {
  private currentStatus: DoomRealtimeStatus = "connecting";
  private readonly frameListeners = new Set<(frame: DoomFrame) => void>();
  private readonly pendingCheckpoints: Array<{ resolve: (checkpoint: DoomCheckpoint) => void; reject: (error: Error) => void }> = [];
  private readonly unsubscribe: DoomUnsubscribe;

  constructor(private readonly transport: DoomTransport, public readonly id: string) {
    this.unsubscribe = transport.subscribe((message) => this.receive(message));
  }

  async connect() { await this.transport.connect(this.id); this.currentStatus = "running"; }
  status() { return this.currentStatus; }
  sendInput(input: DoomInput) {
    if (!Number.isSafeInteger(input.tick) || input.tick < 0 || !Array.isArray(input.actions)) throw new DoomRuntimeError("INVALID_INPUT", "Invalid realtime DOOM input");
    this.transport.send(controlMessage({ type: "input", sessionId: this.id, input: JSON.parse(new TextDecoder().decode(serializeDoomInput(input))) }));
  }
  subscribeFrame(callback: (frame: DoomFrame) => void): DoomUnsubscribe { this.frameListeners.add(callback); return () => this.frameListeners.delete(callback); }
  checkpoint(): Promise<DoomCheckpoint> {
    return new Promise((resolve, reject) => { this.pendingCheckpoints.push({ resolve, reject }); this.transport.send(controlMessage({ type: "checkpoint", sessionId: this.id })); });
  }
  async pause() { this.transport.send(controlMessage({ type: "pause", sessionId: this.id })); this.currentStatus = "paused"; }
  async resume() { this.transport.send(controlMessage({ type: "resume", sessionId: this.id })); this.currentStatus = "running"; }
  async close() { if (this.currentStatus !== "closed") { try { this.transport.send(controlMessage({ type: "close", sessionId: this.id })); } catch { /* already disconnected */ } await this.transport.close(); this.unsubscribe(); this.currentStatus = "closed"; this.pendingCheckpoints.splice(0).forEach(({ reject }) => reject(new DoomRuntimeError("EXECUTION_FAILED", "DOOM realtime session closed"))); } }

  private receive(message: DoomTransportMessage) {
    try {
      if (isBinary(message)) { const frame = decodeDoomFrame(message); if (frame.sessionId !== this.id) return; this.frameListeners.forEach((listener) => listener(frame)); return; }
      const event = JSON.parse(message) as GatewayMessage;
      if (event.version !== DOOM_REALTIME_PROTOCOL_VERSION) throw new DoomRuntimeError("INVALID_RECEIPT", "Unsupported DOOM realtime protocol version");
      if (event.type === "checkpoint") this.pendingCheckpoints.shift()?.resolve(event.checkpoint);
      if (event.type === "status") this.currentStatus = event.status;
      if (event.type === "error") this.pendingCheckpoints.shift()?.reject(new DoomRuntimeError("EXECUTION_FAILED", event.message));
    } catch (error) { this.currentStatus = "error"; this.pendingCheckpoints.shift()?.reject(error instanceof Error ? error : new Error("DOOM realtime message failed")); }
  }
}
