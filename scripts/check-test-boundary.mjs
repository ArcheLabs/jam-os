import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const config = fs.readFileSync(path.join(root, "vite.config.ts"), "utf8");
if (!config.includes('include: ["tests/unit/**/*.test.ts"]')) {
  console.error("Vitest boundary must use the tests/unit allowlist");
  process.exit(1);
}
if (config.includes('include: ["**/*.test.ts"]') || config.includes('include: ["**/*.test.js"]')) {
  console.error("Vitest boundary is too broad");
  process.exit(1);
}
console.log("Test discovery boundary: PASS (tests/unit allowlist)");
