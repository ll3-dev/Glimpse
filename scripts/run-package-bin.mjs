#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const [, , packageName, ...args] = process.argv;

if (!packageName) {
  console.error("Usage: node scripts/run-package-bin.mjs <package-name> [...args]");
  process.exit(1);
}

const startDir = process.cwd();

function findPackageJsonPath(name, cwd) {
  let currentDir = cwd;

  while (true) {
    const directPath = join(currentDir, "node_modules", name, "package.json");
    if (existsSync(directPath)) {
      return directPath;
    }

    const bunStoreDir = join(currentDir, "node_modules", ".bun");
    if (existsSync(bunStoreDir)) {
      for (const entry of readdirSync(bunStoreDir)) {
        const candidate = join(bunStoreDir, entry, "node_modules", name, "package.json");
        if (existsSync(candidate)) {
          return candidate;
        }
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

const packageJsonPath = findPackageJsonPath(packageName, startDir);
if (!packageJsonPath) {
  console.error(`Could not locate package "${packageName}" from ${startDir}.`);
  process.exit(1);
}
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

const binField = packageJson.bin;
if (!binField) {
  console.error(`Package "${packageName}" does not declare a bin entry.`);
  process.exit(1);
}

const relativeBinPath =
  typeof binField === "string" ? binField : binField[packageName] ?? Object.values(binField)[0];

if (typeof relativeBinPath !== "string" || relativeBinPath.length === 0) {
  console.error(`Package "${packageName}" has an invalid bin entry.`);
  process.exit(1);
}

const packageDir = dirname(packageJsonPath);
const binPath = isAbsolute(relativeBinPath)
  ? relativeBinPath
  : resolve(packageDir, relativeBinPath);

const result = spawnSync(process.execPath, [binPath, ...args], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
