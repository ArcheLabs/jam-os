import {
  action,
  wallet,
  stateMap,
  query,
  bytes,
  address,
  u32,
  record,
} from "jam";

const Name = bytes(32);

const Entry = record({
  owner: address,
  serviceId: u32,
});

const names = stateMap({
  schema: "jns.names/v1",
  key: Name,
  value: Entry,
});

function validName(name: Uint8Array): boolean {
  if (name.length < 3 || name.length > 32) return false;
  if (name[0] === 45 || name[name.length - 1] === 45) return false;

  for (let index = 0; index < name.length; index++) {
    const value = name[index];
    const lower = value >= 97 && value <= 122;
    const digit = value >= 48 && value <= 57;
    const hyphen = value === 45;
    if (!lower && !digit && !hyphen) return false;
  }

  return true;
}

function sameAddress(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== 32 || right.length !== 32) return false;
  for (let index = 0; index < 32; index++) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export const claim = action({
  auth: wallet(),
  input: {
    name: Name,
    serviceId: u32,
  },
  execute(ctx, input) {
    if (!validName(input.name)) throw new Error("INVALID_NAME");
    if (names.has(input.name)) throw new Error("NAME_TAKEN");
    names.set(input.name, {
      owner: ctx.sender,
      serviceId: input.serviceId,
    });
  },
});

export const bind = action({
  auth: wallet(),
  input: {
    name: Name,
    serviceId: u32,
  },
  execute(ctx, input) {
    if (!validName(input.name)) throw new Error("INVALID_NAME");

    const current = names.get(input.name);
    if (!current) throw new Error("NAME_NOT_FOUND");
    if (!sameAddress(current.owner, ctx.sender)) throw new Error("NOT_OWNER");

    names.set(input.name, {
      owner: current.owner,
      serviceId: input.serviceId,
    });
  },
});

export const resolve = query(names);
