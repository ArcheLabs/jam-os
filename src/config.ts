export const LIVE_CONFIG = {
  apiUrl: "https://playground.minijam.xyz/api/v1",
  networkLabel: "MiniJAM",
  computerArtifactPath: "computer-service.bin",
  computerServiceMinItemGas: 10_000_000,
  computerServiceMinMemoGas: 10_000_000,
  jnsServiceId: null as string | null,
} as const;

export function computerArtifactUrl(): string {
  return new URL(LIVE_CONFIG.computerArtifactPath, document.baseURI).toString();
}
