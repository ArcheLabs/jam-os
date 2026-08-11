import type { AccountAdapter, CompileInput, CompileOutput, DeployInput, DeployOutput, InteractInput, InteractOutput, PlaygroundAdapter } from "./types";
import { PlaygroundCompileError } from "./errors";
import { MiniJamTransport } from "./transport";
import { bytesToBase64 } from "./encoding";

export class RealPlaygroundAdapter implements PlaygroundAdapter {
  constructor(private readonly transport = new MiniJamTransport(), private readonly account: AccountAdapter) {}
  compile(input: CompileInput) { return this.transport.build(input); }
  async deploy(input: DeployInput): Promise<DeployOutput> { const account = input.account || await this.account.current(); if (!account) throw new Error("Connect a Polkadot account before deploying a Service"); return this.transport.createService(input, account, this.account); }
  async interact(input: InteractInput): Promise<InteractOutput> { const account = input.account || await this.account.current(); if (!account) throw new Error("Connect a Polkadot account before interacting with a Service"); const result = await this.transport.submitWork(input, account, this.account, new TextEncoder().encode(input.payload)); return { status: "succeeded", output: new TextDecoder().decode(result.output), operationId: result.operationId }; }
}
export class MockPlaygroundAdapter implements PlaygroundAdapter {
  async compile(input: CompileInput): Promise<CompileOutput> { if (!input.source.trim()) throw new PlaygroundCompileError("Source is empty"); const blobBase64 = bytesToBase64(new TextEncoder().encode(input.source)); return { success: true, blobBase64, codeHash: `0xmock${input.source.length.toString(16)}`, codeLength: input.source.length, diagnostics: ["Mock compiler: no chain request was made."] }; }
  async deploy(_input: DeployInput): Promise<DeployOutput> { return { serviceId: `mock-service-${Date.now()}` }; }
  async interact(input: InteractInput): Promise<InteractOutput> { return { status: "succeeded", output: `Mock interaction with ${input.serviceId}: ${input.payload}` }; }
}
