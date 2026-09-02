import { action, abort, wallet, stateMap, query, bytes, address, u32, bool, record } from "jam";

// The Computer Service stores control-plane metadata only. File bytes and
// artwork live in the content-addressed provider and are referred to by root.
const RootKey = bytes(1);
const ContentRoot = bytes(32);
const IconId = bytes(64);
const Path = bytes(256);
const DisplayName = bytes(32);
const Bio = bytes(256);
const Mime = bytes(96);
const Kind = bytes(16);
const Theme = bytes(32);
const DesktopIndex = bytes(4096);
const DirectoryIndex = bytes(4096);
const ManifestEntries = bytes(4096);

const Profile = record({
  owner: address,
  displayName: DisplayName,
  bio: Bio,
  avatarRoot: ContentRoot,
  avatarSize: u32,
});

const Appearance = record({
  wallpaperRoot: ContentRoot,
  wallpaperSize: u32,
  theme: Theme,
  accent: Theme,
});

const DesktopIcon = record({
  label: IconId,
  target: Path,
  iconRoot: ContentRoot,
  iconSize: u32,
  visible: bool,
  removed: bool,
  x: u32,
  y: u32,
  updatedAt: u32,
});

const NodeMetadata = record({
  path: Path,
  kind: Kind,
  parent: Path,
  mime: Mime,
  size: u32,
  contentRoot: ContentRoot,
  removed: bool,
  updatedAt: u32,
});

const SiteManifest = record({
  index: Path,
  entries: ManifestEntries,
  publishedAt: u32,
  published: bool,
});

const profiles = stateMap({ schema: "computer.profile/v1", key: RootKey, value: Profile });
const appearances = stateMap({ schema: "computer.appearance/v1", key: RootKey, value: Appearance });
const desktopIcons = stateMap({ schema: "computer.desktop-icons/v1", key: IconId, value: DesktopIcon });
const nodes = stateMap({ schema: "computer.nodes/v1", key: Path, value: NodeMetadata });
const manifests = stateMap({ schema: "computer.site-manifest/v1", key: RootKey, value: SiteManifest });
const desktopIndexes = stateMap({ schema: "computer.desktop-index/v1", key: RootKey, value: record({ entries: DesktopIndex }) });
const directoryIndexes = stateMap({ schema: "computer.directory-index/v1", key: Path, value: record({ entries: DirectoryIndex }) });

function isRootKey(key: Uint8Array): boolean {
  return key.length === 1 && key[0] === 0;
}

function sameAddress(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== 32 || right.length !== 32) return false;
  for (let index = 0; index < 32; index++) if (left[index] !== right[index]) return false;
  return true;
}

function requireOwner(key: Uint8Array) {
  if (!isRootKey(key)) abort(1);
  const current = profiles.get(key);
  if (!current) abort(2);
  return current;
}

function requireSender(key: Uint8Array, sender: Uint8Array) {
  const current = requireOwner(key);
  if (!sameAddress(current.owner, sender)) abort(3);
  return current;
}

function validCoordinate(value: number): boolean { return value <= 10000; }
function seedDirectory(path: Uint8Array, parent: Uint8Array) {
  nodes.set(path, { path, kind: new Uint8Array([100, 105, 114, 101, 99, 116, 111, 114, 121]), parent, mime: new Uint8Array([105, 110, 111, 100, 101, 47, 100, 105, 114, 101, 99, 116, 111, 114, 121]), size: 0, contentRoot: new Uint8Array(32), removed: false, updatedAt: 0 });
  directoryIndexes.set(path, { entries: new Uint8Array(0) });
}

export const initialize = action({
  auth: wallet(),
  input: { key: RootKey, displayName: DisplayName },
  execute(ctx, input) {
    if (!isRootKey(input.key)) abort(1);
    if (profiles.has(input.key)) abort(4);
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
  },
});

export const setProfile = action({
  auth: wallet(),
  input: { key: RootKey, displayName: DisplayName, bio: Bio, avatarRoot: ContentRoot, avatarSize: u32 },
  execute(ctx, input) {
    const current = requireSender(input.key, ctx.sender);
    profiles.set(input.key, {
      owner: current.owner,
      displayName: input.displayName,
      bio: input.bio,
      avatarRoot: input.avatarRoot,
      avatarSize: input.avatarSize,
    });
  },
});

export const setAppearance = action({
  auth: wallet(),
  input: { key: RootKey, wallpaperRoot: ContentRoot, wallpaperSize: u32, theme: Theme, accent: Theme },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    appearances.set(input.key, {
      wallpaperRoot: input.wallpaperRoot,
      wallpaperSize: input.wallpaperSize,
      theme: input.theme,
      accent: input.accent,
    });
  },
});

export const upsertDesktopIcon = action({
  auth: wallet(),
  input: { key: RootKey, iconId: IconId, label: IconId, target: Path, iconRoot: ContentRoot, iconSize: u32, visible: bool, x: u32, y: u32, updatedAt: u32 },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    if (!validCoordinate(input.x) || !validCoordinate(input.y)) abort(7);
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
  },
});

export const removeDesktopIcon = action({
  auth: wallet(),
  input: { key: RootKey, iconId: IconId, updatedAt: u32 },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    const current = desktopIcons.get(input.iconId);
    if (!current) abort(5);
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
  },
});

export const setNodeMetadata = action({
  auth: wallet(),
  input: { key: RootKey, path: Path, kind: Kind, parent: Path, mime: Mime, size: u32, contentRoot: ContentRoot, updatedAt: u32 },
  execute(ctx, input) {
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
  },
});

export const removeNodeMetadata = action({
  auth: wallet(),
  input: { key: RootKey, path: Path, updatedAt: u32 },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    const current = nodes.get(input.path);
    if (!current) abort(6);
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
  },
});

export const publishSite = action({
  auth: wallet(),
  input: { key: RootKey, index: Path, entries: ManifestEntries, publishedAt: u32 },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    manifests.set(input.key, {
      index: input.index,
      entries: input.entries,
      publishedAt: input.publishedAt,
      published: true,
    });
  },
});

export const setDesktopIndex = action({
  auth: wallet(),
  input: { key: RootKey, entries: DesktopIndex },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    desktopIndexes.set(input.key, { entries: input.entries });
  },
});

// Directory entries are newline-delimited canonical child names in a bounded
// byte vector. The client sorts and de-duplicates before submitting it.
export const setDirectoryIndex = action({
  auth: wallet(),
  input: { key: RootKey, path: Path, entries: DirectoryIndex },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    directoryIndexes.set(input.path, { entries: input.entries });
  },
});

// Semantic filesystem operations. Each operation commits the node mutation
// and its parent directory index in one service transition, so a failed work
// item cannot leave a half-updated filesystem view.
export const writeFile = action({
  auth: wallet(),
  input: { key: RootKey, path: Path, parent: Path, mime: Mime, size: u32, contentRoot: ContentRoot, updatedAt: u32, parentEntries: DirectoryIndex },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    if (input.path.length === 0 || input.path[0] !== 47 || input.path.length === 1) abort(8);
    const parent = nodes.get(input.parent);
    if (!parent || parent.removed || parent.kind.length !== 9) abort(9);
    nodes.set(input.path, { path: input.path, kind: new Uint8Array([102, 105, 108, 101]), parent: input.parent, mime: input.mime, size: input.size, contentRoot: input.contentRoot, removed: false, updatedAt: input.updatedAt });
    directoryIndexes.set(input.parent, { entries: input.parentEntries });
  },
});

export const mkdir = action({
  auth: wallet(),
  input: { key: RootKey, path: Path, parent: Path, updatedAt: u32, parentEntries: DirectoryIndex },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    if (input.path.length === 0 || input.path[0] !== 47 || input.path.length === 1) abort(8);
    const parent = nodes.get(input.parent);
    if (!parent || parent.removed || parent.kind.length !== 9) abort(9);
    nodes.set(input.path, { path: input.path, kind: new Uint8Array([100, 105, 114, 101, 99, 116, 111, 114, 121]), parent: input.parent, mime: new Uint8Array([105, 110, 111, 100, 101, 47, 100, 105, 114, 101, 99, 116, 111, 114, 121]), size: 0, contentRoot: new Uint8Array(32), removed: false, updatedAt: input.updatedAt });
    directoryIndexes.set(input.path, { entries: new Uint8Array(0) });
    directoryIndexes.set(input.parent, { entries: input.parentEntries });
  },
});

export const removeNode = action({
  auth: wallet(),
  input: { key: RootKey, path: Path, updatedAt: u32, parentEntries: DirectoryIndex },
  execute(ctx, input) {
    const owner = requireSender(input.key, ctx.sender);
    const current = nodes.get(input.path);
    if (!current || current.removed || current.path.length === 1) abort(6);
    nodes.set(input.path, { path: current.path, kind: current.kind, parent: current.parent, mime: current.mime, size: current.size, contentRoot: current.contentRoot, removed: true, updatedAt: input.updatedAt });
    directoryIndexes.set(current.parent, { entries: input.parentEntries });
    void owner;
  },
});

export const renameFile = action({
  auth: wallet(),
  input: { key: RootKey, from: Path, to: Path, fromParent: Path, toParent: Path, updatedAt: u32, fromEntries: DirectoryIndex, toEntries: DirectoryIndex },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    const current = nodes.get(input.from);
    if (!current || current.removed || current.kind.length !== 4 || !sameBytes(current.parent, input.fromParent)) abort(6);
    const targetParent = nodes.get(input.toParent);
    if (!targetParent || targetParent.removed || targetParent.kind.length !== 9) abort(9);
    nodes.set(input.to, { path: input.to, kind: current.kind, parent: input.toParent, mime: current.mime, size: current.size, contentRoot: current.contentRoot, removed: false, updatedAt: input.updatedAt });
    nodes.set(input.from, { path: current.path, kind: current.kind, parent: current.parent, mime: current.mime, size: current.size, contentRoot: current.contentRoot, removed: true, updatedAt: input.updatedAt });
    directoryIndexes.set(input.fromParent, { entries: input.fromEntries });
    directoryIndexes.set(input.toParent, { entries: input.toEntries });
  },
});

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return false;
  return true;
}

export const getProfile = query(profiles);
export const getAppearance = query(appearances);
export const getDesktopIcon = query(desktopIcons);
export const getNodeMetadata = query(nodes);
export const getSiteManifest = query(manifests);
export const getDesktopIndex = query(desktopIndexes);
export const getDirectoryIndex = query(directoryIndexes);
