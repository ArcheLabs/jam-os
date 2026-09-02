import {
  abort, applicationKeyV1, appliedResult, caughtResult, initializeStateView,
  stateDeleteRaw, stateGetRaw, stateHasRaw, stateSetRaw,
} from "./scriptc_runtime.js";
export { abort };

type JamCursor = { input: Uint8Array; offset: number };
function jamTake(cursor: JamCursor, length: number): Uint8Array { const end = cursor.offset + length; if (length < 0 || end < cursor.offset || end > cursor.input.length) throw new Error("invalid JAM bytes"); const value = cursor.input.slice(cursor.offset, end); cursor.offset = end; return value; }
function jamU8(cursor: JamCursor): number { return jamTake(cursor, 1)[0]; }
function jamU16(cursor: JamCursor): number { const b = jamTake(cursor, 2); return b[0] + b[1] * 256; }
function jamU32(cursor: JamCursor): number { const b = jamTake(cursor, 4); return b[0] + b[1] * 256 + b[2] * 65536 + b[3] * 16777216; }
function jamEncodeU8(value: number): Uint8Array { if (value < 0 || value > 255 || Math.floor(value) !== value) throw new Error("u8 out of range"); return new Uint8Array([value]); }
function jamEncodeU16(value: number): Uint8Array { if (value < 0 || value > 65535 || Math.floor(value) !== value) throw new Error("u16 out of range"); return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function jamEncodeU32(value: number): Uint8Array { if (value < 0 || value > 4294967295 || Math.floor(value) !== value) throw new Error("u32 out of range"); return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
function jamConcat(parts: Uint8Array[]): Uint8Array { let length = 0; for (const part of parts) length += part.length; const output = new Uint8Array(length); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output; }
function jamNatural(cursor: JamCursor): number { const first = jamU8(cursor); if (first < 128) return first; let length = 0; while (length < 8 && (first & (128 >>> length)) !== 0) length += 1; if (length === 0 || length > 7) throw new Error("invalid JAM natural"); const low = jamTake(cursor, length); let multiplier = 1; let value = 0; for (let index = 0; index < length; index += 1) { value += low[index] * multiplier; multiplier *= 256; } return value + (first & (127 >>> length)) * multiplier; }
function jamEncodeNatural(value: number): Uint8Array { if (value < 0 || value > 4294967295 || Math.floor(value) !== value) throw new Error("natural out of range"); if (value < 128) return new Uint8Array([value]); let length = 1; let threshold = 16384; while (length < 4 && value >= threshold) { length += 1; threshold *= 128; } let divisor = 1; for (let index = 0; index < length; index += 1) divisor *= 256; const output = new Uint8Array(1 + length); output[0] = ((256 - (1 << (8 - length))) & 255) | (Math.floor(value / divisor) & (127 >>> length)); let multiplier = 1; for (let index = 0; index < length; index += 1) { output[index + 1] = Math.floor(value / multiplier) & 255; multiplier *= 256; } return output; }
function jamFixed(value: Uint8Array, length: number): Uint8Array { if (value.length !== length) throw new Error("fixed bytes length"); return value.slice(); }
function jamBounded(value: Uint8Array, max: number): Uint8Array { if (value.length > max) throw new Error("bounded bytes length"); return jamConcat([jamEncodeNatural(value.length), value]); }



function isRootKey(key: Uint8Array): boolean {
    return key.length === 1 && key[0] === 0;
}

function sameAddress(left: Uint8Array, right: Uint8Array): boolean {
    if (left.length !== 32 || right.length !== 32)
        return false;
    for (let index = 0; index < 32; index++)
        if (left[index] !== right[index])
            return false;
    return true;
}

function requireOwner(key: Uint8Array) {
    if (!isRootKey(key))
        abort(1);
    const current = profiles.get(key);
    if (!current)
        abort(2);
    return current;
}

function requireSender(key: Uint8Array, sender: Uint8Array) {
    const current = requireOwner(key);
    if (!sameAddress(current.owner, sender))
        abort(3);
    return current;
}

function validCoordinate(value: number): boolean { return value <= 10000; }

function seedDirectory(path: Uint8Array, parent: Uint8Array) {
    nodes.set(path, { path, kind: new Uint8Array([100, 105, 114, 101, 99, 116, 111, 114, 121]), parent, mime: new Uint8Array([105, 110, 111, 100, 101, 47, 100, 105, 114, 101, 99, 116, 111, 114, 121]), size: 0, contentRoot: new Uint8Array(32), removed: false, updatedAt: 0 });
    directoryIndexes.set(path, { entries: new Uint8Array(0) });
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
    if (left.length !== right.length)
        return false;
    for (let index = 0; index < left.length; index++)
        if (left[index] !== right[index])
            return false;
    return true;
}

const namespace_profiles = new Uint8Array([99, 111, 109, 112, 117, 116, 101, 114, 46, 112, 114, 111, 102, 105, 108, 101, 47, 118, 49]);
function decode_profiles_value(raw: Uint8Array): { owner: Uint8Array; displayName: Uint8Array; bio: Uint8Array; avatarRoot: Uint8Array; avatarSize: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 32) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 32) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const result = { owner: jamTake(cursor, 32), displayName: v1, bio: v3, avatarRoot: v5, avatarSize: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function encode_profiles_value(value: { owner: Uint8Array; displayName: Uint8Array; bio: Uint8Array; avatarRoot: Uint8Array; avatarSize: number }): Uint8Array { return jamConcat([jamFixed(value.owner, 32), jamBounded(value.displayName, 32), jamBounded(value.bio, 256), jamBounded(value.avatarRoot, 32), jamEncodeU32(value.avatarSize)]); }
function key_profiles(key: Uint8Array): Uint8Array { const canonical = jamBounded(key, 1); return applicationKeyV1(namespace_profiles, canonical); }
const profiles = {
  get(key: Uint8Array): { owner: Uint8Array; displayName: Uint8Array; bio: Uint8Array; avatarRoot: Uint8Array; avatarSize: number } | null { const raw = stateGetRaw(key_profiles(key)); return raw === null ? null : decode_profiles_value(raw); },
  has(key: Uint8Array): boolean { return stateHasRaw(key_profiles(key)); },
  set(key: Uint8Array, value: { owner: Uint8Array; displayName: Uint8Array; bio: Uint8Array; avatarRoot: Uint8Array; avatarSize: number }): void { stateSetRaw(key_profiles(key), encode_profiles_value(value)); },
  delete(key: Uint8Array): void { stateDeleteRaw(key_profiles(key)); },
};

const namespace_appearances = new Uint8Array([99, 111, 109, 112, 117, 116, 101, 114, 46, 97, 112, 112, 101, 97, 114, 97, 110, 99, 101, 47, 118, 49]);
function decode_appearances_value(raw: Uint8Array): { wallpaperRoot: Uint8Array; wallpaperSize: number; theme: Uint8Array; accent: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 32) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 32) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 32) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const result = { wallpaperRoot: v1, wallpaperSize: jamU32(cursor), theme: v3, accent: v5 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function encode_appearances_value(value: { wallpaperRoot: Uint8Array; wallpaperSize: number; theme: Uint8Array; accent: Uint8Array }): Uint8Array { return jamConcat([jamBounded(value.wallpaperRoot, 32), jamEncodeU32(value.wallpaperSize), jamBounded(value.theme, 32), jamBounded(value.accent, 32)]); }
function key_appearances(key: Uint8Array): Uint8Array { const canonical = jamBounded(key, 1); return applicationKeyV1(namespace_appearances, canonical); }
const appearances = {
  get(key: Uint8Array): { wallpaperRoot: Uint8Array; wallpaperSize: number; theme: Uint8Array; accent: Uint8Array } | null { const raw = stateGetRaw(key_appearances(key)); return raw === null ? null : decode_appearances_value(raw); },
  has(key: Uint8Array): boolean { return stateHasRaw(key_appearances(key)); },
  set(key: Uint8Array, value: { wallpaperRoot: Uint8Array; wallpaperSize: number; theme: Uint8Array; accent: Uint8Array }): void { stateSetRaw(key_appearances(key), encode_appearances_value(value)); },
  delete(key: Uint8Array): void { stateDeleteRaw(key_appearances(key)); },
};

const namespace_desktopIcons = new Uint8Array([99, 111, 109, 112, 117, 116, 101, 114, 46, 100, 101, 115, 107, 116, 111, 112, 45, 105, 99, 111, 110, 115, 47, 118, 49]);
function decode_desktopIcons_value(raw: Uint8Array): { label: Uint8Array; target: Uint8Array; iconRoot: Uint8Array; iconSize: number; visible: boolean; removed: boolean; x: number; y: number; updatedAt: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 64) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 32) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const v6 = jamU8(cursor); if (v6 > 1) throw new Error("invalid bool"); const v7 = jamU8(cursor); if (v7 > 1) throw new Error("invalid bool"); const result = { label: v1, target: v3, iconRoot: v5, iconSize: jamU32(cursor), visible: v6 === 1, removed: v7 === 1, x: jamU32(cursor), y: jamU32(cursor), updatedAt: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function encode_desktopIcons_value(value: { label: Uint8Array; target: Uint8Array; iconRoot: Uint8Array; iconSize: number; visible: boolean; removed: boolean; x: number; y: number; updatedAt: number }): Uint8Array { return jamConcat([jamBounded(value.label, 64), jamBounded(value.target, 256), jamBounded(value.iconRoot, 32), jamEncodeU32(value.iconSize), jamEncodeU8(value.visible ? 1 : 0), jamEncodeU8(value.removed ? 1 : 0), jamEncodeU32(value.x), jamEncodeU32(value.y), jamEncodeU32(value.updatedAt)]); }
function key_desktopIcons(key: Uint8Array): Uint8Array { const canonical = jamBounded(key, 64); return applicationKeyV1(namespace_desktopIcons, canonical); }
const desktopIcons = {
  get(key: Uint8Array): { label: Uint8Array; target: Uint8Array; iconRoot: Uint8Array; iconSize: number; visible: boolean; removed: boolean; x: number; y: number; updatedAt: number } | null { const raw = stateGetRaw(key_desktopIcons(key)); return raw === null ? null : decode_desktopIcons_value(raw); },
  has(key: Uint8Array): boolean { return stateHasRaw(key_desktopIcons(key)); },
  set(key: Uint8Array, value: { label: Uint8Array; target: Uint8Array; iconRoot: Uint8Array; iconSize: number; visible: boolean; removed: boolean; x: number; y: number; updatedAt: number }): void { stateSetRaw(key_desktopIcons(key), encode_desktopIcons_value(value)); },
  delete(key: Uint8Array): void { stateDeleteRaw(key_desktopIcons(key)); },
};

const namespace_nodes = new Uint8Array([99, 111, 109, 112, 117, 116, 101, 114, 46, 110, 111, 100, 101, 115, 47, 118, 49]);
function decode_nodes_value(raw: Uint8Array): { path: Uint8Array; kind: Uint8Array; parent: Uint8Array; mime: Uint8Array; size: number; contentRoot: Uint8Array; removed: boolean; updatedAt: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 256) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 16) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 256) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const v6 = jamNatural(cursor); if (v6 > 96) throw new Error("bound exceeded"); const v7 = jamTake(cursor, v6); const v8 = jamNatural(cursor); if (v8 > 32) throw new Error("bound exceeded"); const v9 = jamTake(cursor, v8); const v10 = jamU8(cursor); if (v10 > 1) throw new Error("invalid bool"); const result = { path: v1, kind: v3, parent: v5, mime: v7, size: jamU32(cursor), contentRoot: v9, removed: v10 === 1, updatedAt: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function encode_nodes_value(value: { path: Uint8Array; kind: Uint8Array; parent: Uint8Array; mime: Uint8Array; size: number; contentRoot: Uint8Array; removed: boolean; updatedAt: number }): Uint8Array { return jamConcat([jamBounded(value.path, 256), jamBounded(value.kind, 16), jamBounded(value.parent, 256), jamBounded(value.mime, 96), jamEncodeU32(value.size), jamBounded(value.contentRoot, 32), jamEncodeU8(value.removed ? 1 : 0), jamEncodeU32(value.updatedAt)]); }
function key_nodes(key: Uint8Array): Uint8Array { const canonical = jamBounded(key, 256); return applicationKeyV1(namespace_nodes, canonical); }
const nodes = {
  get(key: Uint8Array): { path: Uint8Array; kind: Uint8Array; parent: Uint8Array; mime: Uint8Array; size: number; contentRoot: Uint8Array; removed: boolean; updatedAt: number } | null { const raw = stateGetRaw(key_nodes(key)); return raw === null ? null : decode_nodes_value(raw); },
  has(key: Uint8Array): boolean { return stateHasRaw(key_nodes(key)); },
  set(key: Uint8Array, value: { path: Uint8Array; kind: Uint8Array; parent: Uint8Array; mime: Uint8Array; size: number; contentRoot: Uint8Array; removed: boolean; updatedAt: number }): void { stateSetRaw(key_nodes(key), encode_nodes_value(value)); },
  delete(key: Uint8Array): void { stateDeleteRaw(key_nodes(key)); },
};

const namespace_manifests = new Uint8Array([99, 111, 109, 112, 117, 116, 101, 114, 46, 115, 105, 116, 101, 45, 109, 97, 110, 105, 102, 101, 115, 116, 47, 118, 49]);
function decode_manifests_value(raw: Uint8Array): { index: Uint8Array; entries: Uint8Array; publishedAt: number; published: boolean } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 256) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 4096) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamU8(cursor); if (v4 > 1) throw new Error("invalid bool"); const result = { index: v1, entries: v3, publishedAt: jamU32(cursor), published: v4 === 1 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function encode_manifests_value(value: { index: Uint8Array; entries: Uint8Array; publishedAt: number; published: boolean }): Uint8Array { return jamConcat([jamBounded(value.index, 256), jamBounded(value.entries, 4096), jamEncodeU32(value.publishedAt), jamEncodeU8(value.published ? 1 : 0)]); }
function key_manifests(key: Uint8Array): Uint8Array { const canonical = jamBounded(key, 1); return applicationKeyV1(namespace_manifests, canonical); }
const manifests = {
  get(key: Uint8Array): { index: Uint8Array; entries: Uint8Array; publishedAt: number; published: boolean } | null { const raw = stateGetRaw(key_manifests(key)); return raw === null ? null : decode_manifests_value(raw); },
  has(key: Uint8Array): boolean { return stateHasRaw(key_manifests(key)); },
  set(key: Uint8Array, value: { index: Uint8Array; entries: Uint8Array; publishedAt: number; published: boolean }): void { stateSetRaw(key_manifests(key), encode_manifests_value(value)); },
  delete(key: Uint8Array): void { stateDeleteRaw(key_manifests(key)); },
};

const namespace_desktopIndexes = new Uint8Array([99, 111, 109, 112, 117, 116, 101, 114, 46, 100, 101, 115, 107, 116, 111, 112, 45, 105, 110, 100, 101, 120, 47, 118, 49]);
function decode_desktopIndexes_value(raw: Uint8Array): { entries: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 4096) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const result = { entries: v1 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function encode_desktopIndexes_value(value: { entries: Uint8Array }): Uint8Array { return jamConcat([jamBounded(value.entries, 4096)]); }
function key_desktopIndexes(key: Uint8Array): Uint8Array { const canonical = jamBounded(key, 1); return applicationKeyV1(namespace_desktopIndexes, canonical); }
const desktopIndexes = {
  get(key: Uint8Array): { entries: Uint8Array } | null { const raw = stateGetRaw(key_desktopIndexes(key)); return raw === null ? null : decode_desktopIndexes_value(raw); },
  has(key: Uint8Array): boolean { return stateHasRaw(key_desktopIndexes(key)); },
  set(key: Uint8Array, value: { entries: Uint8Array }): void { stateSetRaw(key_desktopIndexes(key), encode_desktopIndexes_value(value)); },
  delete(key: Uint8Array): void { stateDeleteRaw(key_desktopIndexes(key)); },
};

const namespace_directoryIndexes = new Uint8Array([99, 111, 109, 112, 117, 116, 101, 114, 46, 100, 105, 114, 101, 99, 116, 111, 114, 121, 45, 105, 110, 100, 101, 120, 47, 118, 49]);
function decode_directoryIndexes_value(raw: Uint8Array): { entries: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 4096) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const result = { entries: v1 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function encode_directoryIndexes_value(value: { entries: Uint8Array }): Uint8Array { return jamConcat([jamBounded(value.entries, 4096)]); }
function key_directoryIndexes(key: Uint8Array): Uint8Array { const canonical = jamBounded(key, 256); return applicationKeyV1(namespace_directoryIndexes, canonical); }
const directoryIndexes = {
  get(key: Uint8Array): { entries: Uint8Array } | null { const raw = stateGetRaw(key_directoryIndexes(key)); return raw === null ? null : decode_directoryIndexes_value(raw); },
  has(key: Uint8Array): boolean { return stateHasRaw(key_directoryIndexes(key)); },
  set(key: Uint8Array, value: { entries: Uint8Array }): void { stateSetRaw(key_directoryIndexes(key), encode_directoryIndexes_value(value)); },
  delete(key: Uint8Array): void { stateDeleteRaw(key_directoryIndexes(key)); },
};

function decode_initialize_input(raw: Uint8Array): { key: Uint8Array; displayName: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 32) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const result = { key: v1, displayName: v3 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_initialize(ctx: { sender: Uint8Array }, input: { key: Uint8Array; displayName: Uint8Array }): void {
    if (!isRootKey(input.key))
        abort(1);
    if (profiles.has(input.key))
        abort(4);
    profiles.set(input.key, {
        owner: ctx.sender,
        displayName: input.displayName,
        bio: new Uint8Array(0),
        avatarRoot: new Uint8Array(32),
        avatarSize: 0,
    });
    appearances.set(input.key, {
        wallpaperRoot: new Uint8Array(32),
        wallpaperSize: 0,
        theme: new Uint8Array(0),
        accent: new Uint8Array(0),
    });
    manifests.set(input.key, {
        index: new Uint8Array(0),
        entries: new Uint8Array(0),
        publishedAt: 0,
        published: false,
    });
    desktopIndexes.set(input.key, { entries: new Uint8Array(0) });
    directoryIndexes.set(new Uint8Array([47]), { entries: new Uint8Array(0) });
    seedDirectory(new Uint8Array([47]), new Uint8Array(0));
}
export function __jamscript_action_initialize_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_initialize_input(payload); execute_initialize({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_setProfile_input(raw: Uint8Array): { key: Uint8Array; displayName: Uint8Array; bio: Uint8Array; avatarRoot: Uint8Array; avatarSize: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 32) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 256) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const v6 = jamNatural(cursor); if (v6 > 32) throw new Error("bound exceeded"); const v7 = jamTake(cursor, v6); const result = { key: v1, displayName: v3, bio: v5, avatarRoot: v7, avatarSize: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_setProfile(ctx: { sender: Uint8Array }, input: { key: Uint8Array; displayName: Uint8Array; bio: Uint8Array; avatarRoot: Uint8Array; avatarSize: number }): void {
    const current = requireSender(input.key, ctx.sender);
    profiles.set(input.key, {
        owner: current.owner,
        displayName: input.displayName,
        bio: input.bio,
        avatarRoot: input.avatarRoot,
        avatarSize: input.avatarSize,
    });
}
export function __jamscript_action_setProfile_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_setProfile_input(payload); execute_setProfile({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_setAppearance_input(raw: Uint8Array): { key: Uint8Array; wallpaperRoot: Uint8Array; wallpaperSize: number; theme: Uint8Array; accent: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 32) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 32) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const v6 = jamNatural(cursor); if (v6 > 32) throw new Error("bound exceeded"); const v7 = jamTake(cursor, v6); const result = { key: v1, wallpaperRoot: v3, wallpaperSize: jamU32(cursor), theme: v5, accent: v7 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_setAppearance(ctx: { sender: Uint8Array }, input: { key: Uint8Array; wallpaperRoot: Uint8Array; wallpaperSize: number; theme: Uint8Array; accent: Uint8Array }): void {
    requireSender(input.key, ctx.sender);
    appearances.set(input.key, {
        wallpaperRoot: input.wallpaperRoot,
        wallpaperSize: input.wallpaperSize,
        theme: input.theme,
        accent: input.accent,
    });
}
export function __jamscript_action_setAppearance_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_setAppearance_input(payload); execute_setAppearance({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_upsertDesktopIcon_input(raw: Uint8Array): { key: Uint8Array; iconId: Uint8Array; label: Uint8Array; target: Uint8Array; iconRoot: Uint8Array; iconSize: number; visible: boolean; x: number; y: number; updatedAt: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 64) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 64) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const v6 = jamNatural(cursor); if (v6 > 256) throw new Error("bound exceeded"); const v7 = jamTake(cursor, v6); const v8 = jamNatural(cursor); if (v8 > 32) throw new Error("bound exceeded"); const v9 = jamTake(cursor, v8); const v10 = jamU8(cursor); if (v10 > 1) throw new Error("invalid bool"); const result = { key: v1, iconId: v3, label: v5, target: v7, iconRoot: v9, iconSize: jamU32(cursor), visible: v10 === 1, x: jamU32(cursor), y: jamU32(cursor), updatedAt: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_upsertDesktopIcon(ctx: { sender: Uint8Array }, input: { key: Uint8Array; iconId: Uint8Array; label: Uint8Array; target: Uint8Array; iconRoot: Uint8Array; iconSize: number; visible: boolean; x: number; y: number; updatedAt: number }): void {
    requireSender(input.key, ctx.sender);
    if (!validCoordinate(input.x) || !validCoordinate(input.y))
        abort(7);
    desktopIcons.set(input.iconId, {
        label: input.label,
        target: input.target,
        iconRoot: input.iconRoot,
        iconSize: input.iconSize,
        visible: input.visible,
        removed: false,
        x: input.x,
        y: input.y,
        updatedAt: input.updatedAt,
    });
}
export function __jamscript_action_upsertDesktopIcon_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_upsertDesktopIcon_input(payload); execute_upsertDesktopIcon({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_removeDesktopIcon_input(raw: Uint8Array): { key: Uint8Array; iconId: Uint8Array; updatedAt: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 64) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const result = { key: v1, iconId: v3, updatedAt: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_removeDesktopIcon(ctx: { sender: Uint8Array }, input: { key: Uint8Array; iconId: Uint8Array; updatedAt: number }): void {
    requireSender(input.key, ctx.sender);
    const current = desktopIcons.get(input.iconId);
    if (!current)
        abort(5);
    desktopIcons.set(input.iconId, {
        label: current.label,
        target: current.target,
        iconRoot: current.iconRoot,
        iconSize: current.iconSize,
        visible: false,
        removed: true,
        x: current.x,
        y: current.y,
        updatedAt: input.updatedAt,
    });
}
export function __jamscript_action_removeDesktopIcon_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_removeDesktopIcon_input(payload); execute_removeDesktopIcon({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_setNodeMetadata_input(raw: Uint8Array): { key: Uint8Array; path: Uint8Array; kind: Uint8Array; parent: Uint8Array; mime: Uint8Array; size: number; contentRoot: Uint8Array; updatedAt: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 16) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const v6 = jamNatural(cursor); if (v6 > 256) throw new Error("bound exceeded"); const v7 = jamTake(cursor, v6); const v8 = jamNatural(cursor); if (v8 > 96) throw new Error("bound exceeded"); const v9 = jamTake(cursor, v8); const v10 = jamNatural(cursor); if (v10 > 32) throw new Error("bound exceeded"); const v11 = jamTake(cursor, v10); const result = { key: v1, path: v3, kind: v5, parent: v7, mime: v9, size: jamU32(cursor), contentRoot: v11, updatedAt: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_setNodeMetadata(ctx: { sender: Uint8Array }, input: { key: Uint8Array; path: Uint8Array; kind: Uint8Array; parent: Uint8Array; mime: Uint8Array; size: number; contentRoot: Uint8Array; updatedAt: number }): void {
    requireSender(input.key, ctx.sender);
    nodes.set(input.path, {
        path: input.path,
        kind: input.kind,
        parent: input.parent,
        mime: input.mime,
        size: input.size,
        contentRoot: input.contentRoot,
        removed: false,
        updatedAt: input.updatedAt,
    });
}
export function __jamscript_action_setNodeMetadata_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_setNodeMetadata_input(payload); execute_setNodeMetadata({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_removeNodeMetadata_input(raw: Uint8Array): { key: Uint8Array; path: Uint8Array; updatedAt: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const result = { key: v1, path: v3, updatedAt: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_removeNodeMetadata(ctx: { sender: Uint8Array }, input: { key: Uint8Array; path: Uint8Array; updatedAt: number }): void {
    requireSender(input.key, ctx.sender);
    const current = nodes.get(input.path);
    if (!current)
        abort(6);
    nodes.set(input.path, {
        path: current.path,
        kind: current.kind,
        parent: current.parent,
        mime: current.mime,
        size: current.size,
        contentRoot: current.contentRoot,
        removed: true,
        updatedAt: input.updatedAt,
    });
}
export function __jamscript_action_removeNodeMetadata_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_removeNodeMetadata_input(payload); execute_removeNodeMetadata({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_publishSite_input(raw: Uint8Array): { key: Uint8Array; index: Uint8Array; entries: Uint8Array; publishedAt: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 4096) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const result = { key: v1, index: v3, entries: v5, publishedAt: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_publishSite(ctx: { sender: Uint8Array }, input: { key: Uint8Array; index: Uint8Array; entries: Uint8Array; publishedAt: number }): void {
    requireSender(input.key, ctx.sender);
    manifests.set(input.key, {
        index: input.index,
        entries: input.entries,
        publishedAt: input.publishedAt,
        published: true,
    });
}
export function __jamscript_action_publishSite_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_publishSite_input(payload); execute_publishSite({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_setDesktopIndex_input(raw: Uint8Array): { key: Uint8Array; entries: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 4096) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const result = { key: v1, entries: v3 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_setDesktopIndex(ctx: { sender: Uint8Array }, input: { key: Uint8Array; entries: Uint8Array }): void {
    requireSender(input.key, ctx.sender);
    desktopIndexes.set(input.key, { entries: input.entries });
}
export function __jamscript_action_setDesktopIndex_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_setDesktopIndex_input(payload); execute_setDesktopIndex({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_setDirectoryIndex_input(raw: Uint8Array): { key: Uint8Array; path: Uint8Array; entries: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 4096) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const result = { key: v1, path: v3, entries: v5 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_setDirectoryIndex(ctx: { sender: Uint8Array }, input: { key: Uint8Array; path: Uint8Array; entries: Uint8Array }): void {
    requireSender(input.key, ctx.sender);
    directoryIndexes.set(input.path, { entries: input.entries });
}
export function __jamscript_action_setDirectoryIndex_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_setDirectoryIndex_input(payload); execute_setDirectoryIndex({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_writeFile_input(raw: Uint8Array): { key: Uint8Array; path: Uint8Array; parent: Uint8Array; mime: Uint8Array; size: number; contentRoot: Uint8Array; updatedAt: number; parentEntries: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 256) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const v6 = jamNatural(cursor); if (v6 > 96) throw new Error("bound exceeded"); const v7 = jamTake(cursor, v6); const v8 = jamNatural(cursor); if (v8 > 32) throw new Error("bound exceeded"); const v9 = jamTake(cursor, v8); const v10 = jamNatural(cursor); if (v10 > 4096) throw new Error("bound exceeded"); const v11 = jamTake(cursor, v10); const result = { key: v1, path: v3, parent: v5, mime: v7, size: jamU32(cursor), contentRoot: v9, updatedAt: jamU32(cursor), parentEntries: v11 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_writeFile(ctx: { sender: Uint8Array }, input: { key: Uint8Array; path: Uint8Array; parent: Uint8Array; mime: Uint8Array; size: number; contentRoot: Uint8Array; updatedAt: number; parentEntries: Uint8Array }): void {
    requireSender(input.key, ctx.sender);
    if (input.path.length === 0 || input.path[0] !== 47 || input.path.length === 1)
        abort(8);
    const parent = nodes.get(input.parent);
    if (!parent || parent.removed || parent.kind.length !== 9)
        abort(9);
    nodes.set(input.path, { path: input.path, kind: new Uint8Array([102, 105, 108, 101]), parent: input.parent, mime: input.mime, size: input.size, contentRoot: input.contentRoot, removed: false, updatedAt: input.updatedAt });
    directoryIndexes.set(input.parent, { entries: input.parentEntries });
}
export function __jamscript_action_writeFile_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_writeFile_input(payload); execute_writeFile({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_mkdir_input(raw: Uint8Array): { key: Uint8Array; path: Uint8Array; parent: Uint8Array; updatedAt: number; parentEntries: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 256) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const v6 = jamNatural(cursor); if (v6 > 4096) throw new Error("bound exceeded"); const v7 = jamTake(cursor, v6); const result = { key: v1, path: v3, parent: v5, updatedAt: jamU32(cursor), parentEntries: v7 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_mkdir(ctx: { sender: Uint8Array }, input: { key: Uint8Array; path: Uint8Array; parent: Uint8Array; updatedAt: number; parentEntries: Uint8Array }): void {
    requireSender(input.key, ctx.sender);
    if (input.path.length === 0 || input.path[0] !== 47 || input.path.length === 1)
        abort(8);
    const parent = nodes.get(input.parent);
    if (!parent || parent.removed || parent.kind.length !== 9)
        abort(9);
    nodes.set(input.path, { path: input.path, kind: new Uint8Array([100, 105, 114, 101, 99, 116, 111, 114, 121]), parent: input.parent, mime: new Uint8Array([105, 110, 111, 100, 101, 47, 100, 105, 114, 101, 99, 116, 111, 114, 121]), size: 0, contentRoot: new Uint8Array(32), removed: false, updatedAt: input.updatedAt });
    directoryIndexes.set(input.path, { entries: new Uint8Array(0) });
    directoryIndexes.set(input.parent, { entries: input.parentEntries });
}
export function __jamscript_action_mkdir_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_mkdir_input(payload); execute_mkdir({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_removeNode_input(raw: Uint8Array): { key: Uint8Array; path: Uint8Array; updatedAt: number; parentEntries: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 4096) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const result = { key: v1, path: v3, updatedAt: jamU32(cursor), parentEntries: v5 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_removeNode(ctx: { sender: Uint8Array }, input: { key: Uint8Array; path: Uint8Array; updatedAt: number; parentEntries: Uint8Array }): void {
    const owner = requireSender(input.key, ctx.sender);
    const current = nodes.get(input.path);
    if (!current || current.removed || current.path.length === 1)
        abort(6);
    nodes.set(input.path, { path: current.path, kind: current.kind, parent: current.parent, mime: current.mime, size: current.size, contentRoot: current.contentRoot, removed: true, updatedAt: input.updatedAt });
    directoryIndexes.set(current.parent, { entries: input.parentEntries });
    void owner;
}
export function __jamscript_action_removeNode_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_removeNode_input(payload); execute_removeNode({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_renameFile_input(raw: Uint8Array): { key: Uint8Array; from: Uint8Array; to: Uint8Array; fromParent: Uint8Array; toParent: Uint8Array; updatedAt: number; fromEntries: Uint8Array; toEntries: Uint8Array } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 1) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const v2 = jamNatural(cursor); if (v2 > 256) throw new Error("bound exceeded"); const v3 = jamTake(cursor, v2); const v4 = jamNatural(cursor); if (v4 > 256) throw new Error("bound exceeded"); const v5 = jamTake(cursor, v4); const v6 = jamNatural(cursor); if (v6 > 256) throw new Error("bound exceeded"); const v7 = jamTake(cursor, v6); const v8 = jamNatural(cursor); if (v8 > 256) throw new Error("bound exceeded"); const v9 = jamTake(cursor, v8); const v10 = jamNatural(cursor); if (v10 > 4096) throw new Error("bound exceeded"); const v11 = jamTake(cursor, v10); const v12 = jamNatural(cursor); if (v12 > 4096) throw new Error("bound exceeded"); const v13 = jamTake(cursor, v12); const result = { key: v1, from: v3, to: v5, fromParent: v7, toParent: v9, updatedAt: jamU32(cursor), fromEntries: v11, toEntries: v13 }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_renameFile(ctx: { sender: Uint8Array }, input: { key: Uint8Array; from: Uint8Array; to: Uint8Array; fromParent: Uint8Array; toParent: Uint8Array; updatedAt: number; fromEntries: Uint8Array; toEntries: Uint8Array }): void {
    requireSender(input.key, ctx.sender);
    const current = nodes.get(input.from);
    if (!current || current.removed || current.kind.length !== 4 || !sameBytes(current.parent, input.fromParent))
        abort(6);
    const targetParent = nodes.get(input.toParent);
    if (!targetParent || targetParent.removed || targetParent.kind.length !== 9)
        abort(9);
    nodes.set(input.to, { path: input.to, kind: current.kind, parent: input.toParent, mime: current.mime, size: current.size, contentRoot: current.contentRoot, removed: false, updatedAt: input.updatedAt });
    nodes.set(input.from, { path: current.path, kind: current.kind, parent: current.parent, mime: current.mime, size: current.size, contentRoot: current.contentRoot, removed: true, updatedAt: input.updatedAt });
    directoryIndexes.set(input.fromParent, { entries: input.fromEntries });
    directoryIndexes.set(input.toParent, { entries: input.toEntries });
}
export function __jamscript_action_renameFile_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_renameFile_input(payload); execute_renameFile({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }
