import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readLock(name, expectedRepository) {
  const file = path.join(root, "toolchains", name);
  const source = fs.readFileSync(file, "utf8");
  const repository = source.match(/^repository = "([^"]+)"$/m)?.[1];
  const revision = source.match(/^revision = "([^"]+)"$/m)?.[1];
  if (repository !== expectedRepository) {
    throw new Error(`${name}: repository must be ${expectedRepository}`);
  }
  if (!revision || !/^[0-9a-f]{40}$/.test(revision)) {
    throw new Error(`${name}: revision must be a 40-character lowercase SHA`);
  }
  const url = new URL(repository);
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error(`${name}: repository must be an https GitHub URL`);
  }
  const slug = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "").replace(/\/+$/, "");
  if (!/^[^/]+\/[^/]+$/.test(slug)) {
    throw new Error(`${name}: invalid GitHub repository slug`);
  }
  return { repository, revision, slug };
}

try {
  const jamscript = readLock("jamscript.lock", "https://github.com/ArcheLabs/JamScript");
  const minijam = readLock("minijam-client.lock", "https://github.com/ArcheLabs/minijam-client");
  console.log(`JAMSCRIPT_REPOSITORY_URL=${jamscript.repository}`);
  console.log(`JAMSCRIPT_CHECKOUT_REPOSITORY=${jamscript.slug}`);
  console.log(`JAMSCRIPT_REVISION=${jamscript.revision}`);
  console.log(`MINIJAM_CLIENT_REPOSITORY_URL=${minijam.repository}`);
  console.log(`MINIJAM_CLIENT_CHECKOUT_REPOSITORY=${minijam.slug}`);
  console.log(`MINIJAM_CLIENT_REVISION=${minijam.revision}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
