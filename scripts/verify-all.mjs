#!/usr/bin/env node
// One-command full verification for MANTISSA.
// Runs, in order: typecheck, production build, Cairo invariant tests (snforge),
// mainnet receipt re-derivation, and the live pre-flight simulator.
// Prints a pass/fail summary and exits non-zero if any step fails.
//
// Cairo toolchain discovery (in priority order):
//   1. $SCARB_PATH, $SNFORGE_PATH, $UNIVERSAL_SIERRA_COMPILER env vars
//   2. Local .tools/ installs used by this repository
// A fresh clone should install scarb + snforge (https://docs.swmansion.com/scarb,
// https://foundry.starknet.io) and set those three env vars.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const steps = [];

function run(name, cmd, args, opts = {}) {
  const out = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: opts.cwd ?? root,
    env: opts.env ?? process.env,
    shell: opts.shell ?? process.platform === "win32",
  });
  const ok = out.status === 0;
  steps.push({ name, ok });
  return ok;
}

function firstExisting(candidates) {
  for (const c of candidates) {
    const p = path.isAbsolute(c) ? c : path.join(root, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const scarb = process.env.SCARB_PATH ?? firstExisting([
  ".tools/scarb/scarb-v2.20.1-x86_64-pc-windows-msvc/bin/scarb.exe",
  ".tools/scarb/scarb-v2.20.1-x86_64-pc-windows-msvc/bin/scarb",
]);
const snforge = process.env.SNFORGE_PATH ?? firstExisting([
  ".tools/starknet-foundry/target/release/snforge.exe",
  ".tools/starknet-foundry/target/release/snforge",
]);
const usc = process.env.UNIVERSAL_SIERRA_COMPILER ?? firstExisting([
  ".tools/usc/universal-sierra-compiler-v2.10.0-x86_64-pc-windows-msvc/bin/universal-sierra-compiler.exe",
  ".tools/usc/universal-sierra-compiler-v2.10.0-x86_64-pc-windows-msvc/bin/universal-sierra-compiler",
]);

console.log("== MANTISSA one-command verification ==");
console.log(`cwd: ${root}`);
console.log("");

run("npm run typecheck", "npm", ["run", "typecheck"]);
run("npm run build", "npm", ["run", "build"]);

if (scarb && snforge && usc) {
  const env = {
    ...process.env,
    PATH: `${path.dirname(scarb)}${path.delimiter}${process.env.PATH}`,
    UNIVERSAL_SIERRA_COMPILER: usc,
  };
  run("snforge test (Cairo invariants)", snforge, ["test"], { cwd: path.join(root, "contracts"), env, shell: false });
} else {
  console.log("SKIP  snforge test - Cairo toolchain not found.");
  console.log("      Install scarb and snforge (https://foundry.starknet.io) and set");
  console.log("      SCARB_PATH, SNFORGE_PATH and UNIVERSAL_SIERRA_COMPILER, or restore .tools/.");
  steps.push({ name: "snforge test (Cairo invariants)", ok: false });
}

run("node scripts/verify-mainnet.mjs --all", "node", ["scripts/verify-mainnet.mjs", "--all"]);
run("node scripts/simulate-router.mjs --all", "node", ["scripts/simulate-router.mjs", "--all"]);

console.log("");
console.log("== summary ==");
let failed = 0;
for (const s of steps) {
  console.log(`  ${s.ok ? "ok  " : "FAIL"} ${s.name}`);
  if (!s.ok) failed += 1;
}
console.log(`${steps.length - failed}/${steps.length} steps passed`);
process.exit(failed === 0 ? 0 : 1);