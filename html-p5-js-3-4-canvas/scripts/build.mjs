import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "outputs", "index.html");
const targetDir = join(root, "dist");
const target = join(targetDir, "index.html");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);

console.log("Built static site to dist/index.html");
