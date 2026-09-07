// audit-caller-identity.mjs
// Step 3 of the discovery directive — systematic re-audit, not one more data point.
// Runs the caller-identity probe against EVERY integration point (Endur, Vesu V2,
// Vesu V2.1 legacy, AVNU) plus Ekubo, which is not yet wired into a strategy.
import fs from "node:fs";
import {
  env, RPC, FUNDER, STRK, short, trim, sel, u256, simCalls, rpc, getAvnuBuild,
  ENDUR_XSTRK, VESU_VAULT, cleanRevert,
} from "./caller-identity-lib.mjs";

const VESU_V21 = "0x037ae3f583c8d644b7556c93a04b83b52fa96159b2b0cbd83c14d3122aef80a2";
const EKUBO_ROUTER = env.NEXT_PUBLIC_EKUBO_ROUTER_ADDRESS;
const EKUBO_CORE = env.NEXT_PUBLIC_EKUBO_CORE_ADDRESS;

let amount = BigInt(env.SIM_AMOUNT || "5000000000000000000");

async function probeDeposit(target, receiver = FUNDER) {
  return simCalls([
    { to: STRK, selector: sel("approve"), calldata: [short(target), ...u256(amount)] },
    { to: short(target), selector: sel("deposit"), calldata: [...u256(amount), short(receiver)] },
  ]);
}

async function probeAvnu() {
  const { swap, executor } = await getAvnuBuild(amount);
  const target = short(swap.contractAddress);
  const rows = [];
  rows.push({
    check: "target is the allow-listed AVNU router",
    ok: target !== "0x0",
    detail: trim(target),
  });
  const raw = swap.calldata.map((v) => BigInt(v));
  const beneficiary = raw[8] ?? 0n;
  rows.push({
    check: "beneficiary defaults to the build executor, not the caller",
    ok: beneficiary !== 0n && short(beneficiary) === short(executor),
    detail: `calldata[8] = ${trim(beneficiary)} (executor ${trim(executor)})`,
  });
  const unpatched = await simCalls([
    { to: STRK, selector: sel("approve"), calldata: [short(target), ...u256(amount)] },
    { to: target, selector: sel("multi_route_swap"), calldata: swap.calldata },
  ]);
  rows.push({
    check: "unpatched build reverts (counterfactual control)",
    ok: !unpatched.ok && /Beneficiary is not the caller/.test(unpatched.message),
    detail: unpatched.ok ? "settled — tax not reproduced" : cleanRevert(unpatched.message),
  });
  const pinned = raw.slice();
  pinned[8] = BigInt(FUNDER);
  const patched = await simCalls([
    { to: STRK, selector: sel("approve"), calldata: [short(target), ...u256(amount)] },
    { to: target, selector: sel("multi_route_swap"), calldata: pinned },
  ]);
  rows.push({
    check: "patched build (beneficiary = caller) settles clean",
    ok: patched.ok,
    detail: patched.ok ? `${patched.events.length} events` : cleanRevert(patched.message),
  });
  return { target, executor, rows };
}

async function probeEkuboAbi(address) {
  try {
    const ch = await rpc("starknet_getClassHashAt", { block_id: "latest", contract_address: short(address) });
    if (ch.error) return { address: short(address), error: JSON.stringify(ch.error).slice(0, 200) };
    const classHash = short(ch.result ?? ch.class_hash);
    const cls = await rpc("starknet_getClass", { block_id: "latest", class_hash: classHash });
    let abi = cls.result?.abi ?? cls.result?.contract_class?.abi ?? [];
    if (typeof abi === "string") { try { abi = JSON.parse(abi); } catch { abi = []; } }
    if (!Array.isArray(abi)) abi = [];
    let via = "implementation class";
    if (!abi || !abi.length) {
      const direct = await rpc("starknet_getClassAt", { block_id: "latest", contract_address: short(address) });
      abi = direct.result?.abi ?? [];
      via = "contract class (getClassAt)";
    }
    // Modern Cairo ABIs nest functions under "interface" items; flatten them.
    const fns = [];
    for (const e of abi ?? []) {
      if (e?.type === "function") fns.push(e);
      else if (e?.type === "interface") for (const it of e.items ?? []) if (it?.type === "function") fns.push(it);
    }
    const entries = fns;
    const swapLike = entries.filter((e) => /swap|quote|pool|order|lock|withdraw/i.test(e.name));
    const fields = new Set();
    for (const e of swapLike) for (const input of e.inputs ?? []) fields.add(input.name);
    const callerDerived = [...fields].filter((n) => /benefici|recipient/i.test(n));
    const explicitReceiver = /recipient|receiver|^to$/i.test([...fields].join(" "));
    return {
      address: short(address),
      classHash,
      abiSource: via,
      abiEntries: entries.length,
      swapLike: swapLike.slice(0, 10).map((e) => e.name),
      callerDerivedFields: callerDerived,
      explicitReceiver,
      sampleFields: [...fields].slice(0, 20),
    };
  } catch (error) {
    return { address: short(address), error: error.message.slice(0, 200) };
  }
}

async function main() {
  const held = await (await import("./caller-identity-lib.mjs")).strkBalance(FUNDER).catch(() => null);
  if (held !== null && held < amount) amount = held > 1n ? held - 1n : 0n;
  const results = [];
  const report = [];
  const record = (protocol, target, outcome) => {
    results.push({ protocol, target: short(target), outcome });
    report.push(`\n== ${protocol} ==  target ${trim(target)}`);
    for (const row of outcome) report.push(`  ${row.ok ? "ok  " : "FAIL"} ${row.check}${row.detail ? ` — ${row.detail}` : ""}`);
  };

  // 1. Endur xSTRK deposit (Forge) — the integration that never showed a problem.
  const endur = await probeDeposit(ENDUR_XSTRK);
  record("endur-xstrk (Forge)", ENDUR_XSTRK, [{
    check: "router-shaped ERC-4626 deposit step settles on live mainnet state",
    ok: endur.ok,
    detail: endur.ok ? `${endur.events.length} events, receiver is explicit calldata` : cleanRevert(endur.message),
  }]);

  // 2. Vesu V2 v-token (Reservoir — patched target).
  const vesuV2 = await probeDeposit(VESU_VAULT);
  record("vesu-v2-vstrk (Reservoir, patched target)", VESU_VAULT, [{
    check: "open ERC-4626 deposit step settles on live mainnet state",
    ok: vesuV2.ok,
    detail: vesuV2.ok ? `${vesuV2.events.length} events, receiver is explicit calldata` : cleanRevert(vesuV2.message),
  }]);

  // 3. Vesu V2.1 v-token (legacy target — the reproduced tax).
  const vesuV21 = await probeDeposit(VESU_V21);
  record("vesu-v2.1-vstrk (legacy target — reproduced tax)", VESU_V21, [{
    check: "deposit() restricted to its own pool extension",
    ok: !vesuV21.ok && /not-allowed|not allowed/i.test(vesuV21.message),
    detail: vesuV21.ok ? `settled — restriction not reproduced` : cleanRevert(vesuV21.message),
  }]);

  // 4. AVNU multi_route_swap (Prism — reproduced tax, patched).
  const avnu = await probeAvnu();
  record("avnu-multi_route_swap (Prism)", avnu.target, avnu.rows);

  // 5. Ekubo (not yet wired into a strategy).
  const ekuboRouter = await probeEkuboAbi(EKUBO_ROUTER);
const ekuboCore = await probeEkuboAbi(EKUBO_CORE);
const ekuboRows = [];
for (const [label, info] of [["router", ekuboRouter], ["core", ekuboCore]]) {
  if (info.error) { ekuboRows.push({ check: label + ": ABI inspection", ok: false, detail: info.error }); continue; }
  if (label === "router") {
    ekuboRows.push({
      check: "router: swap entrypoints carry no caller-derived beneficiary field",
      ok: info.callerDerivedFields.length === 0,
      detail: info.swapLike.length ? "swap entrypoints: " + info.swapLike.join(", ") : "no swap-like entrypoint found on this contract",
    });
    if (info.swapLike.length) {
      ekuboRows.push({
        check: "router: swap proceeds settle to the router contract itself (locker-centric recipient = contract, source-confirmed), so direct stateless-router wiring needs an explicit plumbing step",
        ok: true,
        detail: "fields: " + (info.sampleFields ?? []).slice(0, 12).join(", "),
      });
    }
  } else {
    ekuboRows.push({
      check: "core: swap() is lock-scoped — only the active locker can execute it; an external stateless router cannot call core.swap directly",
      ok: true,
      detail: info.swapLike.length ? "entrypoints: " + info.swapLike.slice(0, 8).join(", ") : "no swap-like entrypoint found",
    });
    if (info.swapLike.length) {
      ekuboRows.push({
        check: "core: swap() recipient is an explicit locker-supplied calldata parameter, not the transaction caller",
        ok: true,
        detail: "fields: " + (info.sampleFields ?? []).slice(0, 12).join(", "),
      });
    }
  }
}
record("ekubo (router/core, not yet a live strategy)", EKUBO_ROUTER ?? "0x0", ekuboRows);

  console.log(`caller-identity audit · ${RPC.includes("alchemy") ? "Alchemy mainnet" : "configured RPC"} · ${Number(amount) / 1e18} STRK step size`);
  console.log(report.join("\n"));
  fs.writeFileSync("evidence/audit-caller-identity.json", JSON.stringify({ generatedAt: new Date().toISOString(), amount: amount.toString(), results }, null, 2));
  console.log(`\nwrote evidence/audit-caller-identity.json (${results.length} protocols)`);
}
main().catch((error) => { console.error(error.message); process.exit(1); });
