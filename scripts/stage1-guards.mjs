import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const productionFiles = [
  "src/runtime/minijam/MiniJamRuntime.ts",
  "src/runtime/minijam/LiveFileSystemRuntime.ts",
  "src/jam/computer.ts",
  "src/public/PublicComputerPage.tsx",
];
const forbidden = ["RealPlaygroundAdapter", "MiniJamDoomRuntime", "scoreForState", "VITE_PLAYGROUND_API_URL", "playground.minijam.xyz", "this.playground.deploy", "fs:blob:", "fs:dir:"];
const violations = [];
for (const relative of productionFiles) {
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, "utf8");
  for (const marker of forbidden) if (source.includes(marker)) violations.push(`${relative}: ${marker}`);
}
const filesystemSource = fs.readFileSync(path.join(root, "src/runtime/minijam/LiveFileSystemRuntime.ts"), "utf8");
for (const marker of ["action(\"setNodeMetadata\"", "action(\"removeNodeMetadata\"", "action(\"setDirectoryIndex\""]) {
  if (filesystemSource.includes(marker)) violations.push(`src/runtime/minijam/LiveFileSystemRuntime.ts: non-atomic filesystem action ${marker}`);
}
for (const file of ["src/runtime/minijam/MiniJamRuntime.ts", "src/public/PublicComputerPage.tsx"]) {
  if (fs.readFileSync(path.join(root, file), "utf8").includes("VITE_CONTENT_UPLOAD_TOKEN")) violations.push(`${file}: browser-exposed upload secret`);
}
if (violations.length) { console.error(violations.join("\n")); process.exit(1); }
console.log("Stage-1 production guards: PASS");
