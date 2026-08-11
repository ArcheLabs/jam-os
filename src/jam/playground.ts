import type { CompileInput, CompileOutput, DeployInput, DeployOutput, InteractInput, InteractOutput, PlaygroundAdapter } from "./types";
import { PlaygroundCompileError } from "./errors";

async function response<T>(url: string, init?: RequestInit): Promise<T> { const result = await fetch(url, init); const body = await result.json().catch(() => ({})); if (!result.ok) throw new Error((body as { message?: string }).message || `Playground request failed (${result.status})`); return body as T; }
export class RealPlaygroundAdapter implements PlaygroundAdapter {
  constructor(private readonly base = (import.meta.env.VITE_PLAYGROUND_API_URL || "https://playground.minijam.xyz/api/v1").replace(/\/$/, "")) {}
  compile(input: CompileInput) { return response<CompileOutput>(`${this.base}/build`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ language: input.language, source: input.source, optimization: input.optimization || "Os" }) }); }
  deploy(input: DeployInput) { return response<DeployOutput>(`${this.base}/services`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); }
  async interact(input: InteractInput): Promise<InteractOutput> { return response<InteractOutput>(`${this.base}/work`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ serviceId: input.serviceId, payload: btoa(input.payload), extrinsicsBase64: [] }) }); }
}
export class MockPlaygroundAdapter implements PlaygroundAdapter {
  async compile(input: CompileInput): Promise<CompileOutput> { if (!input.source.trim()) throw new PlaygroundCompileError("Source is empty"); const blobBase64 = btoa(unescape(encodeURIComponent(input.source))); return { success: true, blobBase64, codeHash: `0xmock${input.source.length.toString(16)}`, codeLength: input.source.length, diagnostics: ["Mock compiler: no chain request was made."] }; }
  async deploy(_input: DeployInput): Promise<DeployOutput> { return { serviceId: `mock-service-${Date.now()}` }; }
  async interact(input: InteractInput): Promise<InteractOutput> { return { status: "succeeded", output: `Mock interaction with ${input.serviceId}: ${input.payload}` }; }
}
