export interface NetworkInfo { name: string; endpoint: string; healthy: boolean; block?: string; genesisHash?: string; }
export interface AccountInfo { address: string; name?: string; source?: string; type?: string; }
export interface ComputerInspection { kind: string; protocolVersion: number; serviceId: string; controller: string; owner?: string; codeHash: string; }
export interface InvokeOptions { account?: AccountInfo | null; }
export interface InvokeResult { output: Uint8Array; operationId?: string; }
export interface JamClient {
  readonly isMock?: boolean;
  network(): Promise<NetworkInfo>;
  readService(serviceId: string, request: Uint8Array): Promise<Uint8Array>;
  invokeService(serviceId: string, request: Uint8Array, options?: InvokeOptions): Promise<InvokeResult>;
  getCurrentAccount(): Promise<AccountInfo | null>;
}
export interface SignContext { action: "create_service" | "work"; }
export interface AccountAdapter { current(): Promise<AccountInfo | null>; connect(): Promise<AccountInfo>; disconnect(): Promise<void>; sign?(payloadHex: string, context: SignContext): Promise<string>; }
export interface CompileInput { language: "c" | "cpp"; source: string; optimization?: "O0" | "Os"; }
export interface CompileOutput { success: boolean; blobBase64: string; codeHash: string; codeLength: number; diagnostics: string[]; }
export interface DeployInput { blobBase64: string; codeHash: string; minItemGas: number; minMemoGas: number; account?: AccountInfo | null; }
export interface DeployOutput { serviceId: string; operationId?: string; }
export interface InteractInput { serviceId: string; payload: string; account?: AccountInfo | null; }
export interface InteractOutput { status: string; output?: string; operationId?: string; }
export interface PlaygroundAdapter { compile(input: CompileInput): Promise<CompileOutput>; deploy(input: DeployInput): Promise<DeployOutput>; interact(input: InteractInput): Promise<InteractOutput>; }
export interface FileNode { version: 1; type: "file"; path: string; size: number; contentHash: string; chunkSize: number; chunks: number; mime?: string; updatedAt?: number; }
export interface DirectoryNode { version: 1; type: "directory"; path: string; children: string[]; }
export type ListedNode = FileNode | DirectoryNode;
export interface JamSiteManifest { version: 1; root?: string; generatedAt?: number; publishedAt?: number; index: "/index.html"; files: Record<string, { path?: string; mime: string; size: number; contentHash?: string; hash?: string; chunks?: number }> | Array<{ path: string; mime: string; size: number; contentHash?: string; hash?: string; chunks?: number }>; }
export interface JnsRecord { version: 1; name: string; owner: string; serviceId: string; }
