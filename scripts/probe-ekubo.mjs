// probe-ekubo.mjs
// Corrected Ekubo audit probe: flattens Cairo ABI interface entries, lists
// swap/liquidity entrypoints, and reports whether any field is caller-derived
// (beneficiary/recipient) or restricts the caller.
import fs from "node:fs";
import { hash } from "starknet";
import { env, short, trim, rpc } from "./caller-identity-lib.mjs";

function loadEnv() {
  const e = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) e[m[1]] = m[2];
  }
  return e;
}
const E = loadEnv();
const ADDRS = {
  router: E.NEXT_PUBLIC_EKUBO_ROUTER_ADDRESS,
  core: E.NEXT_PUBLIC_EKUBO_CORE_ADDRESS,
};

function flattenAbi(abi) {
  const out = [];
  for (const item of abi ?? []) {
    if (item?.type === "function") out.push(item);
    else if (item?.type === "interface") for (const it of item.items ?? []) if (it?.type === "function") out.push({ ...it, _interface: item.name });
  }
  return out;
}

async function inspect(label, address) {
  if (!address) return { label, address: null, error: "no address configured (NEXT_PUBLIC_EKUBO_" + label.toUpperCase() + "_ADDRESS unset)" };
  const a = short(address);
  const chRes = await rpc("starknet_getClassHashAt", { block_id: "latest", contract_address: a });
  if (chRes.error) return { label, address: a, error: JSON.stringify(chRes.error).slice(0, 200) };
  const classHash = short(chRes.result);
  const cls = await rpc("starknet_getClass", { block_id: "latest", class_hash: classHash });
  let abi = cls.result?.abi;
  if (typeof abi === "string") { try { abi = JSON.parse(abi); } catch { abi = []; } }
  const fns = flattenAbi(abi);
  const byType = cls.result?.entry_points_by_type ?? {};
  const external = (byType.EXTERNAL ?? byType.external ?? []).map((e) => short(e.selector));
  const swapLike = fns.filter((f) => /swap|quote|pool|order|deposit|withdraw|lock/i.test(f.name));
  const named = new Map();
  for (const f of fns) named.set("0x" + BigInt(hash.getSelectorFromName(f.name)).toString(16), f.name);
  const unnamed = external.filter((s) => !named.has(s)).slice(0, 20);
  return {
    label,
    address: a,
    classHash,
    abiFunctions: fns.length,
    externalSelectors: external.length,
    swapLike: swapLike.map((f) => f.name + (f._interface ? " (in " + f._interface + ")" : "")),
    swapFields: swapLike.length ? [...new Set(swapLike.flatMap((f) => (f.inputs ?? []).map((i) => i.name)))].slice(0, 25) : [],
    callerDerived: swapLike.length ? [...new Set(swapLike.flatMap((f) => (f.inputs ?? []).map((i) => i.name)))].filter((n) => /benefici|recipient|receiver|^to$|account/i.test(n)) : [],
    unnamedExternalSelectors: unnamed,
  };
}

const results = {};
for (const [label, addr] of Object.entries(ADDRS)) {
  results[label] = await inspect(label, addr);
  console.log("\n==" + label.toUpperCase() + "==");
  console.log(JSON.stringify(results[label], null, 2).slice(0, 3000));
}
fs.writeFileSync("evidence/ekubo-probe.json", JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
console.log("\nwrote evidence/ekubo-probe.json");
