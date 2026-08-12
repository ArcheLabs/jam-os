const PREFIX = "jam-os:computer:";

function key(genesisHash: string, accountHex: string) {
  return `${PREFIX}${genesisHash}:${accountHex}`;
}

export function readComputerCache(genesisHash: string, accountHex: string): string | null {
  try {
    return localStorage.getItem(key(genesisHash, accountHex));
  } catch {
    return null;
  }
}

export function writeComputerCache(genesisHash: string, accountHex: string, serviceId: string) {
  try {
    localStorage.setItem(key(genesisHash, accountHex), serviceId);
  } catch {
    // Local persistence is optional; chain verification remains authoritative.
  }
}

export function clearComputerCache(genesisHash: string, accountHex: string) {
  try {
    localStorage.removeItem(key(genesisHash, accountHex));
  } catch {
    // Ignore private browsing and storage quota failures.
  }
}
