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

function validName(name: Uint8Array): boolean {
    if (name.length < 3 || name.length > 32)
        return false;
    if (name[0] === 45 || name[name.length - 1] === 45)
        return false;
    for (let index = 0; index < name.length; index++) {
        const value = name[index];
        const lower = value >= 97 && value <= 122;
        const digit = value >= 48 && value <= 57;
        const hyphen = value === 45;
        if (!lower && !digit && !hyphen)
            return false;
    }
    return true;
}

function sameAddress(left: Uint8Array, right: Uint8Array): boolean {
    if (left.length !== 32 || right.length !== 32)
        return false;
    for (let index = 0; index < 32; index++) {
        if (left[index] !== right[index])
            return false;
    }
    return true;
}

const namespace_names = new Uint8Array([106, 110, 115, 46, 110, 97, 109, 101, 115, 47, 118, 49]);
function decode_names_value(raw: Uint8Array): { owner: Uint8Array; serviceId: number } { const cursor: JamCursor = { input: raw, offset: 0 };  const result = { owner: jamTake(cursor, 32), serviceId: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function encode_names_value(value: { owner: Uint8Array; serviceId: number }): Uint8Array { return jamConcat([jamFixed(value.owner, 32), jamEncodeU32(value.serviceId)]); }
function key_names(key: Uint8Array): Uint8Array { const canonical = jamBounded(key, 32); return applicationKeyV1(namespace_names, canonical); }
const names = {
  get(key: Uint8Array): { owner: Uint8Array; serviceId: number } | null { const raw = stateGetRaw(key_names(key)); return raw === null ? null : decode_names_value(raw); },
  has(key: Uint8Array): boolean { return stateHasRaw(key_names(key)); },
  set(key: Uint8Array, value: { owner: Uint8Array; serviceId: number }): void { stateSetRaw(key_names(key), encode_names_value(value)); },
  delete(key: Uint8Array): void { stateDeleteRaw(key_names(key)); },
};

function decode_claim_input(raw: Uint8Array): { name: Uint8Array; serviceId: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 32) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const result = { name: v1, serviceId: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_claim(ctx: { sender: Uint8Array }, input: { name: Uint8Array; serviceId: number }): void {
    if (!validName(input.name))
        abort(1);
    if (names.has(input.name))
        abort(2);
    names.set(input.name, {
        owner: ctx.sender,
        serviceId: input.serviceId,
    });
}
export function __jamscript_action_claim_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_claim_input(payload); execute_claim({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }

function decode_bind_input(raw: Uint8Array): { name: Uint8Array; serviceId: number } { const cursor: JamCursor = { input: raw, offset: 0 }; const v0 = jamNatural(cursor); if (v0 > 32) throw new Error("bound exceeded"); const v1 = jamTake(cursor, v0); const result = { name: v1, serviceId: jamU32(cursor) }; if (cursor.offset !== raw.length) throw new Error("trailing JAM bytes"); return result; }
function execute_bind(ctx: { sender: Uint8Array }, input: { name: Uint8Array; serviceId: number }): void {
    if (!validName(input.name))
        abort(1);
    const current = names.get(input.name);
    if (!current)
        abort(3);
    if (!sameAddress(current.owner, ctx.sender))
        abort(4);
    names.set(input.name, {
        owner: current.owner,
        serviceId: input.serviceId,
    });
}
export function __jamscript_action_bind_v1(payload: Uint8Array, sender: Uint8Array, stateView: Uint8Array): Uint8Array { try { initializeStateView(stateView); if (sender.length !== 32) throw new Error("wallet sender length"); const input = decode_bind_input(payload); execute_bind({ sender }, input); return appliedResult(); } catch (error) { return caughtResult(error); } }
