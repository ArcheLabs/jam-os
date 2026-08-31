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
  root: Path,
  index: Path,
  mime: Mime,
  size: u32,
  contentRoot: ContentRoot,
  publishedAt: u32,
  published: bool,
});

const profiles = stateMap({ schema: "computer.profile/v1", key: RootKey, value: Profile });
const appearances = stateMap({ schema: "computer.appearance/v1", key: RootKey, value: Appearance });
const desktopIcons = stateMap({ schema: "computer.desktop-icons/v1", key: IconId, value: DesktopIcon });
const nodes = stateMap({ schema: "computer.nodes/v1", key: Path, value: NodeMetadata });
const manifests = stateMap({ schema: "computer.site-manifest/v1", key: RootKey, value: SiteManifest });

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
      root: new Uint8Array(0),
      index: new Uint8Array(0),
      mime: new Uint8Array(0),
      size: 0,
      contentRoot: new Uint8Array(32),
      publishedAt: 0,
      published: false,
    });
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
  input: { key: RootKey, iconId: IconId, label: IconId, target: Path, iconRoot: ContentRoot, iconSize: u32, visible: bool, updatedAt: u32 },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    desktopIcons.set(input.iconId, {
      label: input.label,
      target: input.target,
      iconRoot: input.iconRoot,
      iconSize: input.iconSize,
      visible: input.visible,
      removed: false,
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
  input: { key: RootKey, root: Path, index: Path, mime: Mime, size: u32, contentRoot: ContentRoot, publishedAt: u32 },
  execute(ctx, input) {
    requireSender(input.key, ctx.sender);
    manifests.set(input.key, {
      root: input.root,
      index: input.index,
      mime: input.mime,
      size: input.size,
      contentRoot: input.contentRoot,
      publishedAt: input.publishedAt,
      published: true,
    });
  },
});

export const getProfile = query(profiles);
export const getAppearance = query(appearances);
export const getDesktopIcon = query(desktopIcons);
export const getNodeMetadata = query(nodes);
export const getSiteManifest = query(manifests);
