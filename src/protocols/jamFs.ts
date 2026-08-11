import { JamInvalidPathError } from "../jam/errors";

export const MAX_PATH_LENGTH = 1024;
export function normalizePath(input: string, cwd = "/home/user"): string {
  if (!input) return normalizePath(cwd);
  const raw = input.startsWith("/") ? input : `${cwd}/${input}`;
  const parts: string[] = [];
  for (const part of raw.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (parts.length) parts.pop(); else throw new JamInvalidPathError("Path escapes root"); }
    else parts.push(part);
  }
  const result = `/${parts.join("/")}`;
  if (result.length > MAX_PATH_LENGTH) throw new JamInvalidPathError("Path is too long");
  return result;
}

export function parentPath(path: string): string { const normalized = normalizePath(path); const i = normalized.lastIndexOf("/"); return i <= 0 ? "/" : normalized.slice(0, i); }
export function basename(path: string): string { const normalized = normalizePath(path); return normalized === "/" ? "/" : normalized.slice(normalized.lastIndexOf("/") + 1); }
export function joinPath(base: string, child: string): string { return normalizePath(`${base}/${child}`); }
export const JAM_FS_CHUNK_BYTES = 16 * 1024;
export function chunkBytes(value: Uint8Array, chunkSize = JAM_FS_CHUNK_BYTES): Uint8Array[] { if (chunkSize < 1) throw new RangeError("chunkSize must be positive"); const chunks: Uint8Array[] = []; for (let offset = 0; offset < value.length; offset += chunkSize) chunks.push(value.slice(offset, offset + chunkSize)); return chunks.length ? chunks : [new Uint8Array()]; }
export function reassembleChunks(chunks: readonly Uint8Array[]): Uint8Array { const result = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0)); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; } return result; }
