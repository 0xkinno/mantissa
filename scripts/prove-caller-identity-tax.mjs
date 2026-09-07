// prove-caller-identity-tax.mjs
// Step 4 of the discovery directive — the controlled before/after comparison.
// Runs the unpatched and patched builds against the SAME live mainnet state,
// back to back, so the only variable between the two runs is the specific
// caller-identity assumption being tested.
import fs from "node:fs";
import {
  env, RPC, FUNDER, STRK, ROUTER, short, trim, sel, u256, simCalls, strkBalance,
  getAvnuBuild, cleanRevert, VESU_VAULT,
} from "./caller-identity-lib.mjs";

const VESU_V21 = "0x037ae3f583c8d644b7556c93a04b83b52fa96159b2b0cbd83c14d3122aef80a2";
const rpcLabel = RPC.includes("alchemy") ? "Alchemy mainnet" : "configured RPC";
const DEPOSIT = sel("deposit");
const APPROVE = sel("approve");
let amount = BigInt(env.SIM_AMOUNT || "5000000000000000000");
const evidence = {};
const lines = [];

async function clampAmount() {
  const held = await strkBalance(FUNDER).catch(() => null);
  if (held !== null && held < amount) amount = held > 1n ? held - 1n : 0n;
  return amount;
}
const approveAnd = (target, selector, calldata) => [
  { to: STRK, selector: APPROVE, calldata: [short(target), ...u256(amount)] },
  { to: short(target), selector, calldata },
];

async function proveAvnu() {
  lines.push("\nAVNU multi_route_swap (Prism) — STRK → ETH");
  const { swap, executor } = await getAvnuBuild(amount);
  const target = short(swap.contractAddress);
  const raw = swap.calldata.map((v) => BigInt(v));
  const unpatched = await simCalls(approveAnd(target, sel("multi_route_swap"), raw));
  const unpatchedOk = !unpatched.ok && /Beneficiary is not the caller/.test(unpatched.message);
  lines.push(`  unpatched (beneficiary = AVNU executor ${trim(executor)} as built):`);
  lines.push(unpatchedOk ? "    FAIL  reverts \"Beneficiary is not the caller\"" : `    NOTE  ${unpatched.ok ? "settled clean (tax not reproduced)" : cleanRevert(unpatched.message)}`);
  const patched = raw.slice();
  patched[8] = BigInt(FUNDER);
  const settled = await simCalls(approveAnd(target, sel("multi_route_swap"), patched));
  lines.push("  patched (beneficiary = executing account):");
  lines.push(settled.ok ? `    ok    settles clean, ${settled.events.length} events` : `    FAIL  ${cleanRevert(settled.message)}`);
  lines.push("  recipe mapping (production):");
  lines.push("    ok    the executing router is AVNU's caller (pool-only caller guard I1), and the recipe pins calldata[8] to that router before submission; the receipt does not expose calldata, so the pin is enforced at build time and verified by simulate-router.mjs, not re-derivable from the receipt");
  evidence.avnu = {
    target, executor, rpc: rpcLabel, amount: amount.toString(),
    unpatched: { reverted: !unpatched.ok, revert: unpatched.message },
    patched: { ok: settled.ok, events: settled.events.length },
    callerInSimulation: "the counterfactual executes as an account; AVNU compares beneficiary to its caller, so pinning beneficiary to the sim caller isolates the beneficiary == caller assumption",
    reproduced: unpatchedOk && settled.ok,
  };
  fs.writeFileSync("evidence/prove-caller-identity-tax-avnu.json", JSON.stringify({ ...evidence.avnu, generatedAt: new Date().toISOString() }, null, 2));
}

async function proveVesu() {
  lines.push("\nVesu v-token deposit() (Reservoir) — STRK → vSTRK");
  const before = await simCalls(approveAnd(VESU_V21, DEPOSIT, [...u256(amount), short(FUNDER)]));
  const beforeOk = !before.ok && /not-allowed|not allowed/i.test(before.message);
  lines.push("  V2.1 vSTRK v-token deposit() — original allow-listed target (pool-extension-gated):");
  lines.push(beforeOk ? "    FAIL  reverts 'not-allowed' for a non-extension caller" : `    NOTE  ${before.ok ? "settled clean (restriction not reproduced)" : cleanRevert(before.message)}`);
  const after = await simCalls(approveAnd(VESU_VAULT, DEPOSIT, [...u256(amount), short(FUNDER)]));
  lines.push("  V2 vSTRK v-token deposit() — patched target (open ERC-4626):");
  lines.push(after.ok ? `    ok    settles clean, ${after.events.length} events` : `    FAIL  ${cleanRevert(after.message)}`);
  evidence.vesu = {
    legacyTarget: short(VESU_V21), patchedTarget: short(VESU_VAULT), rpc: rpcLabel, amount: amount.toString(),
    unpatched: { reverted: !before.ok, revert: before.message },
    patched: { ok: after.ok, events: after.events.length },
    reproduced: beforeOk && after.ok,
  };
  fs.writeFileSync("evidence/prove-caller-identity-tax-vesu.json", JSON.stringify({ ...evidence.vesu, generatedAt: new Date().toISOString() }, null, 2));
}

async function main() {
  await clampAmount();
  const target = process.argv[2] ?? "--all";
  console.log(`prove-caller-identity-tax · ${rpcLabel} · step size ${Number(amount) / 1e18} STRK · no gas spent (SKIP_VALIDATE + SKIP_FEE_CHARGE)`);
  lines.push(`prove-caller-identity-tax · ${rpcLabel} · step size ${Number(amount) / 1e18} STRK`);
  if (target === "avnu" || target === "--all") await proveAvnu();
  if (target === "vesu" || target === "--all") await proveVesu();
  console.log(lines.join("\n"));
  fs.writeFileSync("evidence/prove-caller-identity-tax.txt", `${new Date().toISOString()}\n${lines.join("\n")}\n`);
  console.log("\nwrote evidence/prove-caller-identity-tax.txt and evidence/prove-caller-identity-tax-{avnu,vesu}.json");
}
main().catch((error) => { console.error(error.message); process.exit(1); });
